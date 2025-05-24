import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { otpStore } from "../otpStore"; 

const generateOTP = (): number => Math.floor(100000 + Math.random() * 900000);

export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const otp = generateOTP();
        otpStore[email] = otp; 
        console.log(`Before storing OTP - Email: ${email}, Generated OTP: ${otp}`);
        console.log(`After storing OTP - ${email}: ${otpStore[email]}`);

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER as string,
                pass: process.env.EMAIL_PASS as string,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your Verification Code",
            text: `Your verification code is: ${otp}. It expires in 5 minutes.`,
        };

        await transporter.sendMail(mailOptions);
        return NextResponse.json({ message: "OTP sent successfully!" }, { status: 200 });
    } catch (error) {
        console.error("Error sending OTP:", error);
        return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
    }
}
