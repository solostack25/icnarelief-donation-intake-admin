"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<{ email: string; password: string } | null>(null);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/list-users");
    const data = await res.json();
    if (data.users) setUsers(data.users);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setCreating(false);

    if (!data.success) {
      setError(data.error ?? "Could not create user");
      return;
    }

    setJustCreated({ email, password });
    setEmail("");
    setPassword(generatePassword());
    loadUsers();
  }

  return (
    <main className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-dark mb-1">Admin Users</h1>
      <p className="text-gray-500 text-sm mb-6">
        Anyone created here can sign in and has full dashboard access, including creating more users.
      </p>

      {justCreated && (
        <div className="mb-6 rounded-xl border border-brand bg-brand-light p-4 text-sm">
          <p className="font-semibold text-brand-dark mb-1">User created — share these once, they won't be shown again:</p>
          <p>Email: <span className="font-mono">{justCreated.email}</span></p>
          <p>Password: <span className="font-mono">{justCreated.password}</span></p>
        </div>
      )}

      <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 bg-white p-4 mb-8 space-y-3">
        <h2 className="font-semibold text-gray-700">Create New User</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-3"
          required
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 p-3 font-mono text-sm"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setPassword(generatePassword())}
            className="rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600"
          >
            Regenerate
          </button>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="rounded-xl bg-brand px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create User"}
        </button>
      </form>

      <h2 className="font-semibold text-gray-700 mb-2">Existing Users</h2>
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {users.map((u) => (
            <div key={u.id} className="p-3 text-sm flex justify-between">
              <span>{u.email}</span>
              <span className="text-gray-400">
                {u.last_sign_in_at ? `Last in ${new Date(u.last_sign_in_at).toLocaleDateString()}` : "Never signed in"}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
