import { LiveCamera } from './components/LiveCamera'

function App() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-green-300">
            PunchHarder
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
            Live boxing camera
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-gray-300">
            First milestone: get a reliable live webcam feed in the browser before adding
            MediaPipe pose landmarks and punch stats.
          </p>
        </header>

        <LiveCamera />
      </div>
    </main>
  )
}

export default App
