import { Link } from 'react-router'
import Button from '@mui/material/Button'

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Hero */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800">
          Prime Focus Inc.
        </h1>
        <p className="mt-3 text-lg text-green-600 tracking-widest uppercase">
          Where Vision Is Our Primary Focus
        </p>
        <p className="mt-6 max-w-2xl mx-auto text-gray-700">
          Prime Focus Inc. improves equitable health outcomes by increasing access to
          vision care for underserved communities. Through early detection, intervention,
          and connection to care, we help individuals see clearly and move forward with
          confidence.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link to="/register">
            <Button variant="contained" color="primary">Register for an Event</Button>
          </Link>
          <Link to="/vision-check">
            <Button variant="outlined" color="primary">Take the Vision Check</Button>
          </Link>
        </div>
      </section>

      {/* Who We Serve */}
      {/* <section className="grid md:grid-cols-3 gap-6 mt-12">
        {[
          { title: 'Children', body: 'Ages 5–17 receive priority scheduling for vision screenings and glasses.' },
          { title: 'Families & Adults', body: 'Comprehensive screenings and connection to affordable vision care.' },
          { title: 'Underserved Communities', body: 'Veterans, older adults, and those facing barriers to vision care.' },
        ].map((c) => (
          <div key={c.title} className="border rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-blue-800">{c.title}</h3>
            <p className="mt-2 text-gray-700">{c.body}</p>
          </div>
        ))}
      </section> */}

      {/* Next Event */}
      {/* <section className="mt-12 bg-blue-50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-blue-800">Next Community Vision Event</h2>
        <p className="mt-2 text-gray-700">September 12 — Register online or on-site.</p>
        <Link to="/events" className="inline-block mt-4 text-blue-700 underline">
          View all events
        </Link>
      </section> */}

      {/* Get Involved */}
      {/* <section className="mt-12 grid md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold">Get Involved</h3>
          <p className="mt-2 text-gray-700">
            Volunteer, donate, or partner with us to expand access to vision care.
          </p>
          <Link to="/resources" className="inline-block mt-3 text-blue-700 underline">
            Explore resources
          </Link>
        </div>
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold">Stay Connected</h3>
          <p className="mt-2 text-gray-700">
            Sign up for our newsletter, including an audio version for those who can't see well.
          </p>
          <Link to="/register" className="inline-block mt-3 text-blue-700 underline">
            Sign up
          </Link>
        </div>
      </section> */}
    </div>
  )
}
