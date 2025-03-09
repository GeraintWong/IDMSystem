import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full text-center">
        <h1 className="text-4xl font-extrabold mb-10 tracking-tight">
          Blockchain-Based Identity Management
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <Link href="/issuer/external" className="block">
            <button className="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 transition duration-300 font-semibold">
              Issuer (External)
            </button>
          </Link>
          <Link href="/issuerProvideCredential/external" className="block">
            <button className="w-full py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition duration-300 font-semibold">
              Issuer Send Credential (External)
            </button>
          </Link>
          <Link href="/holder" className="block">
            <button className="w-full py-4 px-6 rounded-xl bg-green-600 hover:bg-green-700 transition duration-300 font-semibold">
              Holder
            </button>
          </Link>
          <Link href="/issuer/internal" className="block">
            <button className="w-full py-4 px-6 rounded-xl bg-red-600 hover:bg-red-700 transition duration-300 font-semibold">
              Issuer (Internal)
            </button>
          </Link>
          <Link href="/issuerProvideCredential/internal" className="block">
            <button className="w-full py-4 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 transition duration-300 font-semibold">
              Issuer Send Credential (Internal)
            </button>
          </Link>
          <Link href="/verifier/external" className="block">
            <button className="w-full py-4 px-6 rounded-xl bg-yellow-600 hover:bg-yellow-700 transition duration-300 font-semibold text-gray-900">
              Verifier (External)
            </button>
          </Link>
          <Link href="/verifier/internal" className="block">
            <button className="w-full py-4 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 transition duration-300 font-semibold">
              Verifier (Internal)
            </button>
          </Link>
          <Link href="/issuerOCRCredential/external" className="block">
            <button className="w-full py-4 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 transition duration-300 font-semibold">
              OCR (External)
            </button>
          </Link>
          <Link href="/issuerOCRCredential/internal" className="block">
            <button className="w-full py-4 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 transition duration-300 font-semibold">
              OCR (Internal)
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}