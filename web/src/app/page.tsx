import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">GridSense Dashboard</h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Centralized urban traffic and event intelligence platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Operational Intelligence</CardTitle>
            <CardDescription className="text-zinc-400">Event triage, priority prediction, and duration forecasting.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/gateway-a" passHref>
              <Button className="w-full">Open Gateway A</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Traffic Intelligence</CardTitle>
            <CardDescription className="text-zinc-400">Network physics, domino simulation, and propagation analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/gateway-b" passHref>
              <Button className="w-full">Open Gateway B</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
