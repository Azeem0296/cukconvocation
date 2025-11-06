// app/your-ticket/page.tsx

'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // Using path alias
import Image from 'next/image'; // For logo
import jsPDF from 'jspdf'; // For PDF generation
import { svg2pdf } from 'svg2pdf.js';

const YourTicketPage: React.FC = () => {
    // --- State ---
    const [isLoading, setIsLoading] = useState(true); // Tracks overall loading
    const [error, setError] = useState<string | null>(null);
    const [qrSvgString, setQrSvgString] = useState<string | null>(null); // Stores the raw SVG string
    const [studentName, setStudentName] = useState('');
    const [studentEmail, setStudentEmail] = useState(''); // Store email for PDF
    const [studentRollNo, setStudentRollNo] = useState(''); // Store roll no for PDF
    const [program, setProgram] = useState('');
    const [passingYear, setPassingYear] = useState('');

    const [guestOne, setGuestOne] = useState(''); // Store roll no for PDF
    const [guestTwo, setGuestTwo] = useState(''); // Store roll no for PDF
    const [passId, setPassId] = useState<string | null>(null); // Store passId if needed later

    const router = useRouter();

    // --- useEffect: Fetch Ticket Data ---
    useEffect(() => {
        const fetchTicketData = async () => {
            setIsLoading(true);
            setError(null);
            setQrSvgString(null); // Clear previous QR

            // 1. Check Auth & Get Session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session || !session.access_token) {
                console.log("No session found, redirecting to login.");
                router.push('/'); // Redirect to login/home
                return;
            }
            const accessToken = session.access_token;

            let fetchedPassId: string | null = null;

            try {
                // 2. Fetch Student Profile to get pass_id and confirm registration
                console.log("Fetching student profile...");
                const profileResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-student-info-by-auth`,
                    {
                        method: 'POST', // Or 'GET', ensure your function handles it
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                    }
                );

                if (!profileResponse.ok) {
                    const errorData = await profileResponse.json();
                    console.error("Failed to fetch profile:", errorData);
                    throw new Error(errorData.error || "Failed to load your details. Please ensure you are registered.");
                }

                const profile = await profileResponse.json();
                console.log("Profile fetched:", profile);

                // 3. Verify Registration and Pass ID existence
                if (!profile.is_registered || !profile.pass_id) {
                    console.warn("User is not registered or missing pass_id:", profile);
                    // Redirect to home with a specific error if registration isn't complete
                    router.push('/?error=Registration incomplete or pass ID missing. Please register first or contact support.');
                    return;
                }
                fetchedPassId = profile.pass_id;
                setPassId(fetchedPassId); // Store passId

                // 4. Fetch QR Code SVG and Final Details using Pass ID
                if (fetchedPassId) {
                    console.log("Fetching QR SVG and details with pass_id:", fetchedPassId);
                    const qrResponse = await fetch(
                        // Construct GET request URL with query parameter
                        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-qr?pass_id=${encodeURIComponent(fetchedPassId)}`,
                        {
                            method: 'GET', // Use GET as per the updated function
                            headers: {
                                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                                // Authorization might be optional if /get-qr uses service key, but good practice to send
                                'Authorization': `Bearer ${accessToken}`,
                            },
                        }
                    );

                    if (!qrResponse.ok) {
                        const qrErrorData = await qrResponse.json();
                        console.error("Failed to fetch QR details:", qrErrorData);
                        throw new Error(qrErrorData.error || "Failed to load QR code details.");
                    }

                    const qrData = await qrResponse.json(); // Expecting { name, email, roll_no, qrSvgString }
                    console.log("QR data fetched:", qrData);

                    if (!qrData.qrSvgString || !qrData.name || !qrData.email || !qrData.roll_no) {
                        throw new Error("Incomplete QR code data received from server.");
                    }

                    // --- Store fetched data ---
                    setStudentName(qrData.name);
                    setGuestOne(qrData.guest_1_name);
                    setGuestTwo(qrData.guest_2_name);
                    setStudentEmail(qrData.email); // Store for PDF
                    setStudentRollNo(qrData.roll_no); // Store for PDF
                    setProgram(qrData.programme || '');
                    setPassingYear(qrData.year_of_passing || '');

                    setQrSvgString(qrData.qrSvgString); // Store the SVG STRING

                } else {
                    // This case should ideally not be reached due to earlier checks
                    throw new Error("Pass ID was missing unexpectedly.");
                }

            } catch (err: any) {
                console.error("Error fetching ticket data:", err);
                setError(err.message || "An unexpected error occurred while loading your ticket.");
                // Optionally sign out and redirect on critical errors
                // await supabase.auth.signOut();
                // router.push(`/?error=${encodeURIComponent(err.message)}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTicketData();
    }, [router]); // Run on mount and if router changes


    const generatePdf = async () => {
        try {
            if (!qrSvgString || !studentName || !studentEmail || !studentRollNo) {
                setError("Cannot generate PDF: Missing required information.");
                return;
            }
            setError(null);

            // Create jsPDF document (custom ticket size)
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: [100, 175], // width, height
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // ----- Draw Top Purple Section -----
            const purpleTopHeight = 105;
            doc.setFillColor(108, 0, 255); // Deep purple background
            doc.rect(0, 0, pageWidth, purpleTopHeight, "F");

            // Add lighter wave overlay (simulate gradient look)
            doc.setFillColor(155, 80, 255);
            doc.triangle(0, purpleTopHeight - 20, pageWidth, purpleTopHeight - 45, pageWidth, purpleTopHeight, "F");

            // Add curved top/bottom notches
            const notchRadius = 6;
            doc.setFillColor(255, 255, 255);
            doc.circle(pageWidth / 2, 0, notchRadius, "F"); // top notch
            doc.circle(pageWidth / 2, pageHeight, notchRadius, "F"); // bottom notch

            // ----- Convert QR SVG → PNG -----
            const svgBlob = new Blob([qrSvgString], { type: "image/svg+xml;charset=utf-8" });
            const pngDataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const img: HTMLImageElement = document.createElement("img");

                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        const size = 300;
                        canvas.width = size;
                        canvas.height = size;
                        if (!ctx) return reject("Canvas context not available");
                        ctx.fillStyle = "#fff";
                        ctx.fillRect(0, 0, size, size);
                        ctx.drawImage(img, 0, 0, size, size);
                        resolve(canvas.toDataURL("image/png"));
                    };
                    img.onerror = reject;
                    img.src = reader.result as string;
                };
                reader.onerror = reject;
                reader.readAsDataURL(svgBlob);
            });

            // ----- Place QR -----
            const qrSize = 38;
            const qrX = (pageWidth - qrSize) / 2;
            const qrY = 18;
            doc.addImage(pngDataUrl, "PNG", qrX, qrY, qrSize, qrSize,);

            // ----- Text: SCAN HERE -----
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text("SCAN HERE!", pageWidth / 2, qrY + qrSize + 5, { align: "center" });

            // ----- Event Name -----
            doc.setFontSize(14);
            doc.text("CUK CONVOCATION 2025", pageWidth / 2, qrY + qrSize + 15, { align: "center" });

            doc.setFontSize(10);
            doc.text("Central University of Kerala", pageWidth / 2, qrY + qrSize + 21, { align: "center" });

            // ----- Details paragraph -----
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            const infoText =
                "Please present this ticket at the entrance for verification. Keep your QR code visible.";
            const split = doc.splitTextToSize(infoText, pageWidth - 16);
            doc.text(split, pageWidth / 2, qrY + qrSize + 30, { align: "center" });

            // ----- White bottom section -----
            const whiteTop = purpleTopHeight;
            doc.setFillColor(255, 255, 255);
            doc.rect(0, whiteTop, pageWidth, pageHeight - whiteTop, "F");

            // ----- Student Details -----
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("TICKET HOLDER DETAILS", pageWidth / 2, whiteTop + 10, { align: "center" }); // Centered title

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);

            // --- Dynamic Text Positioning ---
            // --- TICKET HOLDER DETAILS (clean layout) ---
            let currentY = whiteTop + 20;
            const lineSpacing = 6;
            const leftMargin = 10;
            const labelWidth = 30; // spacing between label and value

            const drawDetail = (label: string, value: any) => {
                doc.setFont("helvetica", "bold");
                doc.text(`${label}:`, leftMargin, currentY);

                doc.setFont("helvetica", "normal");
                doc.text(String(value || "-"), leftMargin + labelWidth, currentY);

                currentY += lineSpacing;
            };


            // --- Show all required fields ---
            drawDetail("Student", studentName);
            drawDetail("Roll No", studentRollNo);
            drawDetail("Programme", program);
            drawDetail("Year of Passing", passingYear);
            drawDetail("Email", studentEmail);
            

            if (guestOne) drawDetail("Guest 1", guestOne);
            if (guestTwo) drawDetail("Guest 2", guestTwo);


            // --- End Dynamic Text Positioning ---


            // ----- Footer -----
            doc.setFontSize(8);
            doc.setTextColor(120);
            doc.text("CUK Convocation Ticket - 2025", pageWidth / 2, pageHeight - 8, { align: "center" });

            // ----- Save PDF -----
            doc.save(`CUK_Convocation_Ticket_${studentRollNo}.pdf`);
            setError(null);

            await supabase.auth.signOut();
        } catch (err) {
            console.error("PDF generation failed:", err);
            setError("Failed to generate ticket. Please try again.");
        }
    };

    // --- End PDF Function ---


    // --- JSX Rendering ---
    return (
        <div
            className="relative flex items-center justify-center min-h-screen font-sans p-4 bg-cover bg-center"
            style={{ backgroundImage: "url('/college-bg.jpg')" }}
        >
            <div className="absolute inset-0 bg-black/50"></div>

            <div className="relative z-10 w-full max-w-md p-6 sm:p-10 bg-black/30 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 text-center text-white">

                <Image
                    src="/cuk-logo.png" // Path in /public
                    alt="University Logo"
                    width={80} height={80}
                    className="mx-auto mb-4 rounded-full shadow-md object-cover"
                />
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Convocation 2025 Entry Pass</h1>

                {/* Loading State */}
                {isLoading && <p className="text-lg text-gray-200 p-6">Loading your ticket...</p>}

                {/* Error State */}
                {error && <div className="my-4 p-3 rounded-md text-sm font-medium bg-red-500/50 text-white">{error}</div>}

                {/* Success State */}
                {!isLoading && !error && qrSvgString && (
                    <>
                        <p className="text-xl text-gray-100 my-4 font-semibold">Welcome, {studentName}!</p>

                        {/* Display SVG Directly on Page */}
                        <p className="text-base text-gray-200 mb-3">Your Entry QR Code:</p>
                        <div className="flex justify-center mb-6">
                            <div className="bg-white p-2 rounded-lg shadow-xl inline-block">
                                <div
                                    className="qr-wrapper block w-full max-w-[180px] sm:max-w-[200px] [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-w-full"
                                    dangerouslySetInnerHTML={{ __html: qrSvgString }}
                                />
                            </div>
                        </div>


                        <p className="text-sm text-gray-200 mb-6">
                            Please download your official ticket PDF below.
                        </p>

                        {/* Download Button */}
                        <button
                            onClick={generatePdf}
                            disabled={!qrSvgString} // Should always be enabled if this section renders
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md shadow-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5 bg-green-600 hover:bg-green-700 text-white`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Ticket (PDF)
                        </button>

                        <p className="text-xs text-gray-300 mt-4">Take a screenshot as backup.</p>
                    </>
                )}

                {/* Fallback if loading finished but no QR */}
                {!isLoading && !error && !qrSvgString && (
                    <p className="text-lg text-gray-200 p-6">Could not load ticket data. Please contact support if you have registered.</p>
                )}

            </div>
        </div>
    );
};

export default YourTicketPage;