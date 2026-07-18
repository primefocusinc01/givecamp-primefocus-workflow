import { useEffect, useState } from 'react'
import { collection, doc, deleteDoc, getDocs, updateDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { db, DEFAULT_ROLE, type UserRole } from '../firebase'

type UserRecord = {
  uid: string
  email: string
  role: UserRole
}

export default function AdminUsers() {
  const { user, role } = useAuth()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadUsers() {
      try {
        const snapshot = await getDocs(collection(db, 'users'))
        const loadedUsers = snapshot.docs.map((docSnap) => ({
          uid: docSnap.id,
          email: docSnap.data().email ?? '',
          role: (docSnap.data().role as UserRole | undefined) ?? DEFAULT_ROLE,
        }))
        setUsers(loadedUsers)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load users.')
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  const handleRoleChange = async (uid: string, nextRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: nextRole })
      setUsers((current) => current.map((item) => (item.uid === uid ? { ...item, role: nextRole } : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update role.')
    }
  }

  const handleDeleteUser = async (uid: string) => {
    const confirmed = window.confirm('Delete this user profile? This removes the Firestore user record and cannot be undone.')
    if (!confirmed) {
      return
    }

    try {
      await deleteDoc(doc(db, 'users', uid))
      setUsers((current) => current.filter((item) => item.uid !== uid))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete user.')
    }
  }

  if (!user) {
    return <div className="p-6 text-center">Please sign in to view this page.</div>
  }

  if (role !== 'admin') {
    return <div className="p-6 text-center">You do not have permission to view this page.</div>
  }

  return (
    <div className="mx-auto mt-10 max-w-5xl px-4">
      <h1 className="mb-4 text-2xl font-semibold">Manage User Roles</h1>
      <p className="mb-6 text-gray-600">Admins can update the role for each Firebase user profile.</p>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-gray-600">Loading users...</p>
      ) : (
        <div className="overflow-hidden rounded border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">UID</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.uid} className="border-t">
                  <td className="px-4 py-3">{item.email}</td>
                  <td className="px-4 py-3 break-all text-xs text-gray-500">{item.uid}</td>
                  <td className="px-4 py-3">
                    <select
                      value={item.role}
                      onChange={(event) => handleRoleChange(item.uid, event.target.value as UserRole)}
                      className="rounded border px-3 py-2"
                    >
                      <option value="basic-user">Basic User</option>
                      <option value="admin">Admin</option>
                      <option value="doctor">Doctor</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(item.uid)}
                      className="rounded border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
