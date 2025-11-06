// app/page.tsx

'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const LoginPageClient: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(true); // 👈 Modal visible by default

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setLocalError(null);

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });
  };

  useEffect(() => {
    const verifyUserAndRoute = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !urlError && !localError) {
        setIsLoading(true);
        const accessToken = session.access_token;

        if (window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-student-info-by-auth`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          const data = await response.json();
          if (!response.ok) {
            setLocalError(data.error || "Verification failed. Please try again.");
            await supabase.auth.signOut();
          } else {
            if (data.is_registered === true) {
              router.push('/your-ticket');
            } else {
              router.push('/form');
            }
          }
        } catch (err: any) {
          setLocalError(err.message || "Failed to connect to server.");
          await supabase.auth.signOut();
        } finally {
          setIsLoading(false);
        }
      } else if (!session && !urlError && !localError) {
        setIsLoading(false);
      }
    };

    verifyUserAndRoute();
  }, [router, urlError, localError]);

  const error = localError || urlError;

  return (
    <div
      className="relative flex items-center justify-center min-h-screen font-sans p-4 bg-cover bg-center"
      style={{ backgroundImage: "url('/college-bg.jpg')" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* MODAL (Instructions) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 overflow-y-auto">
          {/* Background overlay */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm"></div>

          {/* Modal container */}
          <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl w-full max-w-lg mx-auto my-8 sm:my-10 p-6 sm:p-8 text-white overflow-y-auto max-h-[90vh]">
            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-blue-400 mb-5 text-center drop-shadow-md">
              Student Registration Process
            </h2>

            {/* Instructions */}
            <div className="relative border-l-4 border-blue-400 pl-4">
              <ul
                className="list-none text-sm sm:text-base leading-relaxed space-y-3 tracking-wide"
                style={{
                  textAlign: "justify",
                  textJustify: "inter-word",
                  hyphens: "auto",
                  wordSpacing: "0.08em",
                  lineHeight: "1.6",
                }}
              >
                <li className="flex items-start">
                  <span className="text-blue-300 font-semibold mr-2 select-none">•</span>
                  <span>
                    Students must register using their registered e-mail ID.
                  </span>
                </li>

                <li className="flex items-start">
                  <span className="text-blue-300 font-semibold mr-2 select-none">•</span>
                  <span>
                    All fields fetched from the database will be read-only and disabled.
                  </span>
                </li>

                <li className="flex items-start">
                  <span className="text-blue-300 font-semibold mr-2 select-none">•</span>
                  <span>
                    Students are required to enter the number of accompanying parents and their names.
                    <br />
                    <span className="text-blue-100 italic">
                      (Parents must carry a valid ID card for entry.)
                    </span>
                  </span>
                </li>

                <li className="flex items-start">
                  <span className="text-blue-300 font-semibold mr-2 select-none">•</span>
                  <span>
                    Upon successful registration, a QR code and PDF ticket will be generated.
                  </span>
                </li>

                <li className="flex items-start">
                  <span className="text-blue-300 font-semibold mr-2 select-none">•</span>
                  <span>
                    Carrying a soft or hard copy of the ticket is mandatory for entry into the campus and the event.
                  </span>
                </li>
              </ul>
            </div>

            {/* Button */}
            <div className="flex justify-center mt-7">
              <button
                onClick={() => setShowModal(false)}
                className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-800 text-white font-semibold px-8 py-2.5 rounded-full shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md p-10 bg-black/30 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 text-center">
        <img
          src="/cuk-logo.png"
          alt="University Logo"
          className="w-24 h-24 mx-auto mb-6 rounded-full shadow-md object-cover"
        />

        <h1 className="text-3xl font-bold text-white mb-2">
          Convocation 2025
        </h1>
        <p className="text-lg text-gray-200 mb-8">
          Please sign in to register.
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 rounded-md text-center text-sm font-medium bg-red-500/50 text-white">
            {error}
          </div>
        )}

        {/* Button / Loading */}
        {isLoading ? (
          <div className="py-3 px-4 text-white font-medium">Verifying...</div>
        ) : (
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-gray-800 rounded-md shadow-lg font-medium transition-all duration-300 hover:bg-gray-200 transform hover:-translate-y-0.5"
          >
            {/* Google Icon */}
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.49 44 30.836 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
            </svg>
            Sign in with Google
          </button>
        )}
      </div>
    </div>
  );
};

// Suspense wrapper
export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-white bg-black/50">Loading...</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
