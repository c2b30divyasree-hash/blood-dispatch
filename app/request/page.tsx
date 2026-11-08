'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Clock, MapPin, Loader2, HeartPulse } from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function CreateRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [formData, setFormData] = useState({
    patient_name: '',
    blood_group: 'O+',
    units_required: 1,
    hospital_name: '',
    contact_phone: '',
    radius_km: 10,
    latitude: 13.0827,
    longitude: 80.2707,
  });

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setLocating(false);
      },
      () => {
        alert('Could not retrieve current location.');
        setLocating(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours window

    // PostGIS geography point formatted as WKT
    const pointWkt = `POINT(${formData.longitude} ${formData.latitude})`;

    const { data, error } = await supabase
      .from('emergency_requests')
      .insert([
        {
          patient_name: formData.patient_name,
          blood_group: formData.blood_group,
          units_required: Number(formData.units_required),
          hospital_name: formData.hospital_name,
          hospital_location: pointWkt,
          contact_phone: formData.contact_phone,
          radius_km: Number(formData.radius_km),
          status: 'OPEN',
          expires_at: expiresAt,
        },
      ])
      .select('id')
      .single();

    setLoading(false);

    if (error) {
      alert(`Error creating emergency request: ${error.message}`);
      return;
    }

    router.push(`/dispatch/${data.id}`);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
          <div className="p-3 bg-red-100 text-red-600 rounded-xl">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create Emergency Blood Request</h1>
            <p className="text-xs text-slate-500">Auto-locks and expires after 4 hours to eliminate forward spam</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Patient Name</label>
            <input
              required
              type="text"
              value={formData.patient_name}
              onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800"
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Blood Group</label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 bg-white"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Units Needed</label>
              <input
                required
                type="number"
                min="1"
                max="10"
                value={formData.units_required}
                onChange={(e) => setFormData({ ...formData, units_required: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Hospital / Clinic Name</label>
            <input
              required
              type="text"
              value={formData.hospital_name}
              onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800"
              placeholder="e.g. Apollo Speciality Hospital"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Attendant Contact Number</label>
            <input
              required
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-semibold text-slate-700">Hospital GPS Coordinates</label>
              <button
                type="button"
                onClick={detectLocation}
                disabled={locating}
                className="inline-flex items-center text-xs font-medium text-red-600 hover:text-red-700 gap-1"
              >
                <MapPin className="w-3.5 h-3.5" />
                {locating ? 'Locating...' : 'Use Current Location'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-100 p-3 rounded-lg border border-slate-200">
              <span>Lat: <strong>{formData.latitude.toFixed(5)}</strong></span>
              <span>Long: <strong>{formData.longitude.toFixed(5)}</strong></span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex gap-2.5 text-xs text-amber-800">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>This broadcast automatically closes after <strong>4 hours</strong>. No lingering or spam messages will circulate once fulfilled.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Launch Emergency Radius Dispatch'}
          </button>
        </form>
      </div>
    </main>
  );
}