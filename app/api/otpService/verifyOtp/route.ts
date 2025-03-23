import { NextResponse } from "next/server";
import { otpStore } from "../otpStore"; // ✅ Import shared OTP store

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    
    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    console.log(`Stored OTP: ${otpStore[email]}, User Input OTP: ${otp}`);

    if (otpStore[email] && otpStore[email] === parseInt(otp)) {
      delete otpStore[email]; // ✅ Remove OTP after successful verification
      return NextResponse.json({ message: "OTP verified successfully!" }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
