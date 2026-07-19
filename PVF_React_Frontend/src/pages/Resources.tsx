import { Link } from 'react-router'

const resources = [
  { name: 'Prevent Blindness Ohio', desc: 'A lifetime of healthy vision.', href: 'https://preventblindness.org/ohio/' }
]
export default function Resources() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-blue-800">Resources</h1>
      <p className="mt-2 text-gray-700">
        Community partners and tools to help you find and access vision care.
      </p>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Community Partners</h2>
        <div className="mt-4 space-y-4">
          {resources.map((r) => (
            <a
              key={r.name}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block border rounded-lg p-5 hover:shadow-sm"
            >
              <h3 className="text-lg font-semibold text-blue-700">{r.name}</h3>
              <p className="text-gray-700">{r.desc}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-10 bg-blue-50 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-blue-800">Not sure where to start?</h2>
        <p className="mt-2 text-gray-700">
          Take our free 2-minute Vision Check to see whether a comprehensive eye exam may
          be helpful.
        </p>
        <Link to="/vision-check" className="inline-block mt-3 text-blue-700 underline">
          Start the Vision Check
        </Link>
      </section>
    </div>
  )
}
