import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-white">Blockchain Based Identity Management System</h1> {/* Added a title */}
      <div className="flex space-x-4"> {/* Added spacing between buttons */}
        <Link href="/issuer/external">
          <button className="px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-700 text-white font-medium transition duration-300 ease-in-out">
            Issuer External View
          </button>
        </Link>
        <Link href="/issuerProvideCredential/external">
          <button className="px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-700 text-white font-medium transition duration-300 ease-in-out">
            Issuer Send Credential External View
          </button>
        </Link>
        <Link href="/holder">
          <button className="px-6 py-3 rounded-lg bg-green-500 hover:bg-green-700 text-white font-medium transition duration-300 ease-in-out">
            Holder View
          </button>
        </Link>
        <Link href="/issuer/internal">
          <button className="px-6 py-3 rounded-lg bg-red-500 hover:bg-green-700 text-white font-medium transition duration-300 ease-in-out">
            Issuer Internal View
          </button>
        </Link>
        <Link href="/issuerProvideCredential/internal">
          <button className="px-6 py-3 rounded-lg bg-red-500 hover:bg-green-700 text-white font-medium transition duration-300 ease-in-out">
            Issuer Send Credential Internal View
          </button>
        </Link>
        <Link href="/verifier/external">
          <button className="px-6 py-3 rounded-lg bg-red-500 hover:bg-yellow-700 text-white font-medium transition duration-300 ease-in-out">
            Verifier External View
          </button>
        </Link>
        <Link href="/verifier/internal">
          <button className="px-6 py-3 rounded-lg bg-red-500 hover:bg-yellow-700 text-white font-medium transition duration-300 ease-in-out">
            Verifier Internal View
          </button>
        </Link>
      </div>
    </div>
  );
}