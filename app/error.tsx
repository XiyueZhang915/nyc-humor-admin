"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="gate"><h1>Something went quiet.</h1><p>We could not load the database. Check the connection and assignment 6 migration, then retry.</p><button onClick={reset}>Try again</button></main>}
