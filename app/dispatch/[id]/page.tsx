'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, CheckCircle2, Clock, MapPin, Phone, ShieldAlert, Users } from 'lucide-react';

interface RequestDetail {
  id: string;
  patient_name: string;
  blood_group: string;
  units_required: number;
  hospital_name: string;
  contact_phone: string;
  status: 'OPEN' | 'MATCHED' | 'FULFILLED' | 'EXPIRED';
  expires_at: string;
  created_at: string;
}

export default function DispatchLivePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const requestId = resolvedParams.id;

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadRequest() {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!error && data) {
        setRequest(data);
      }
      setLoading(false);
    }

    loadRequest();

    // Realtime updates listener
    const channel = supabase
      .channel(`request_${requestId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'emergency_requests', filter: `id=eq.${requestId}` },
        (payload) => {
          setRequest(payload.new as RequestDetail);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  useEffect(() => {
    if (!request) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(request.expires_at).getTime();
      const diff = expiry - now;

      if (diff <= 0 || request.status === 'EXPIRED') {
        setIsExpired(true);
        setTimeLeft('00:00:00');
        clearInterval(interval);
      } else {
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [request]);

  const handleManualFulfill = async () => {
    await supabase
      .from('emergency_requests')
      .update({ status: 'FULFILLED' })
      .eq('id', requestId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500 animate-pulse">Loading verified dispatch state...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-center max-w-sm">
          <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800">Request Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">This link might be invalid or deleted.</p>
        </div>
      </div>
    );
  }

  if (isExpired || request.status === 'EXPIRED' || request.status === 'FULFILLED') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          {request.status === 'FULFILLED' ? (
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-900">
            {request.status === 'FULFILLED' ? 'Emergency Fulfilled' : 'Broadcast Expired'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {request.status === 'FULFILLED'
              ? 'Required blood units have been fulfilled. Thank you to all donors.'
              : 'This emergency request window has concluded. No further donors are required.'}
          </p>
          <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-400">
            Reference ID: <span className="font-mono">{request.id.slice(0, 8)}</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="bg-red-600 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider bg-red-700 px-2 py-0.5 rounded">
              Active Dispatch
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold">{request.blood_group}</span>
              <span className="text-sm opacity-90">{request.units_required} unit(s) needed</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs block opacity-80">Auto-expires in</span>
            <span className="font-mono text-xl font-bold">{timeLeft || '--:--:--'}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{request.patient_name}</h2>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <MapPin className="w-4 h-4 text-red-500 shrink-0" />
              <span>{request.hospital_name}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              <span>Status: </span>
              <span className="font-bold text-emerald-600 uppercase">{request.status}</span>
            </div>
            <a
              href={`tel:${request.contact_phone}`}
              className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-lg font-medium hover:bg-slate-800 transition"
            >
              <Phone className="w-3.5 h-3.5" />
              Call Attendant
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Are you near {request.hospital_name}?</p>
              <p className="text-xs text-slate-400">Head to the blood bank directly.</p>
            </div>
          </div>
          <button
            onClick={handleManualFulfill}
            className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg font-semibold hover:bg-emerald-100 transition"
          >
            Mark Fulfilled
          </button>
        </div>
      </div>
    </main>
  );
}