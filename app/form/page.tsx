// app/form/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Picker from "react-mobile-picker";

const Spinner = () => (
  <span className="flex items-center justify-center">
    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  </span>
);

type FormMessage = { text: string; isSuccess: boolean } | null;

const RegistrationPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [program, setProgram] = useState('');
  const [passingYear, setPassingYear] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  const [guests, setGuests] = useState<number | null>(null);
  const [guestsError, setGuestsError] = useState('');

  const [guardian1, setGuardian1] = useState('');
  const [guardian2, setGuardian2] = useState('');
  const [guardian1Error, setGuardian1Error] = useState('');
  const [guardian2Error, setGuardian2Error] = useState('');

  const [formMessage, setFormMessage] = useState<FormMessage>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [tempGuests, setTempGuests] = useState<string>(String(guests ?? ""));

  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.auth.getSession();
      const session = (data as any)?.session;
      if (!session) return router.push('/');

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-student-info-by-auth`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const profile = await res.json();
        if (!res.ok) throw new Error(profile?.error || 'Failed to fetch profile');

        // ✅ Map backend fields
        setFullName(profile?.name ?? '');
        setEmail(profile?.email ?? '');
        setRollNumber(profile?.roll_no ?? '');
        setProgram(profile?.programme ?? ''); // <— Added
        setPassingYear(profile?.year_of_passing ?? ''); // <— Added

        if (profile?.is_registered) {
          setIsAlreadyRegistered(true);
          setGuests(profile?.guest_count ?? 0);
          setGuardian1(profile?.guardian1 ?? '');
          setGuardian2(profile?.guardian2 ?? '');
        } else {
          setGuests(null);
        }
      } catch (err: any) {
        await supabase.auth.signOut();
        router.push(`/?error=${encodeURIComponent(err?.message ?? 'Unknown error')}`);
      } finally {
        setIsFetchingProfile(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleGuestsChange = (value: string) => {
    if (isAlreadyRegistered) return;

    if (value === '') {
      setGuests(null);
      setGuardian1('');
      setGuardian2('');
      return;
    }

    const count = parseInt(value);
    setGuests(count);
    setGuestsError('');

    if (count === 0) {
      setGuardian1('');
      setGuardian2('');
    } else if (count === 1) {
      setGuardian2('');
      setGuardian2Error('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadyRegistered || isFetchingProfile || isSubmitting) return;

    if (guests === null || guests < 0 || guests > 2) {
      setGuestsError('Number of guests must be between 0 and 2.');
      return;
    }

    let hasError = false;

    if (guests > 0 && !guardian1.trim()) {
      setGuardian1Error('Guardian name is required');
      hasError = true;
    }

    if (guests === 2 && !guardian2.trim()) {
      setGuardian2Error('Guardian name is required');
      hasError = true;
    }

    if (hasError) return;

    const { data } = await supabase.auth.getSession();
    const session = (data as any)?.session;
    if (!session) return router.push('/');

    setIsSubmitting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-student-by-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            guest_count: guests,
            guest_1_name: guardian1 || null,
            guest_2_name: guardian2 || null,
          }),
        }
      );

      if (res.ok) {
        router.push('/your-ticket');
      } else {
        const data = await res.json().catch(() => null);
        setFormMessage({ text: data?.error || 'Registration failed.', isSuccess: false });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex items-center justify-center min-h-screen p-4 bg-cover bg-center"
      style={{ backgroundImage: "url('/college-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/50"></div>

      <div className="relative z-10 w-full max-w-lg p-6 sm:p-10 bg-black/30 backdrop-blur-lg rounded-xl shadow-xl border border-white/20">
        <div className="text-center mb-8">
          <img src="/cuk-logo.png" alt="CUK" className="mx-auto mb-4 w-20 h-20 rounded-full" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Central University of Kerala</h1>
          <p className="text-gray-200 mt-2">Convocation 2025 Registration</p>
        </div>

        <form onSubmit={handleSubmit}>
          {!isFetchingProfile && (
            <div className="space-y-5">
              {[
                { label: 'Full Name', value: fullName },
                { label: 'Programme', value: program },
                { label: 'Year of Passing', value: passingYear },
                { label: 'Email', value: email },
                { label: 'Roll Number', value: rollNumber }
              ].map(({ label, value }) => (
                <div key={label}>
                  <label className="block text-sm text-gray-200 mb-1">{label}</label>
                  <input
                    value={value}
                    readOnly
                    disabled
                    className="w-full px-4 py-2 bg-gray-800 text-gray-400 border border-gray-600 rounded cursor-not-allowed"
                  />
                </div>
              ))}

              {/* Guests dropdown */}
              <div>
                <label className="block text-sm text-gray-200 mb-1">Number of Guests (Max 2)</label>

                <button
                  type="button"
                  disabled={isAlreadyRegistered}
                  onClick={() => setShowPicker(true)}
                  className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded"
                >
                  {guests === null ? "Select Guests" : `${guests} Guest${guests > 1 ? "s" : ""}`}
                </button>

                {guestsError && <p className="text-red-400 text-xs mt-1">{guestsError}</p>}
              </div>

              {/* iOS Picker Modal */}
              {showPicker && (
                <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm">
                  <div className="w-full bg-[#0f172a] text-white rounded-t-2xl overflow-hidden shadow-xl pb-8 ios-safe-area">
                    <div className="flex justify-between items-center p-4">
                      <button
                        onClick={() => setShowPicker(false)}
                        className="text-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setGuests(Number(tempGuests));
                          handleGuestsChange(tempGuests);
                          setShowPicker(false);
                        }}
                        className="text-blue-400 font-semibold text-sm"
                      >
                        Done
                      </button>
                    </div>

                    <Picker
                      value={{ guests: tempGuests }}
                      onChange={(v) => setTempGuests(v.guests)}
                      height={200}
                    >
                      <Picker.Column name="guests">
                        <Picker.Item value="" disabled>Select</Picker.Item>
                        <Picker.Item value="0">0</Picker.Item>
                        <Picker.Item value="1">1</Picker.Item>
                        <Picker.Item value="2">2</Picker.Item>
                      </Picker.Column>
                    </Picker>
                  </div>
                </div>
              )}

              {/* Guardian Names */}
              {guests! > 0 && (
                <>
                  <div>
                    <label className="block text-sm text-gray-200 mb-1">Guardian Name 1</label>
                    <input
                      type="text"
                      value={guardian1}
                      onChange={(e) => { setGuardian1(e.target.value); setGuardian1Error(''); }}
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded"
                      placeholder="Guardian 1 Name"
                    />
                    {guardian1Error && <p className="text-red-400 text-xs mt-1">{guardian1Error}</p>}
                  </div>

                  {guests === 2 && (
                    <div>
                      <label className="block text-sm text-gray-200 mb-1">Guardian Name 2</label>
                      <input
                        type="text"
                        value={guardian2}
                        onChange={(e) => { setGuardian2(e.target.value); setGuardian2Error(''); }}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded"
                        placeholder="Guardian 2 Name"
                      />
                      {guardian2Error && <p className="text-red-400 text-xs mt-1">{guardian2Error}</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!isFetchingProfile && !isAlreadyRegistered && (
            <button
              type="submit"
              className="w-full mt-6 py-3 rounded text-white font-medium bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center w-full">
                  <Spinner />
                </div>
              ) : (
                "Register"
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default RegistrationPage;
