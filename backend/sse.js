// Server-Sent Events (SSE) — server can push to clients, but only one direction (server → client), no client-initiated
// push over the same channel
const clients = new Map() // userId (string) → Set of res objects

export function addClient(userId, res) {
    if (!clients.has(userId)) clients.set(userId, new Set())
    clients.get(userId).add(res)
}

export function removeClient(userId, res) {
    clients.get(userId)?.delete(res)
}

export function broadcast(userId, type, payload) {
    const connections = clients.get(userId)
    if (!connections) return
    const message = `data: ${JSON.stringify({ type, payload })}\n\n`
    connections.forEach(res => res.write(message))
}