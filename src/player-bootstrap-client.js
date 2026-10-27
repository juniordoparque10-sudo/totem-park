function snapshotMetadata(snapshot) {
  return {
    exists:Boolean(snapshot?.exists?.()),
    fromCache:Boolean(snapshot?.metadata?.fromCache),
    hasPendingWrites:Boolean(snapshot?.metadata?.hasPendingWrites),
  };
}

export function resolveClientSnapshot({ snapshot, currentClient = null }) {
  const metadata = snapshotMetadata(snapshot);
  if (metadata.exists) {
    return {
      status:"available",
      resolved:true,
      replaceClient:true,
      client:{ id:snapshot.id, ...snapshot.data() },
      metadata,
      serverConfirmed:!metadata.fromCache && !metadata.hasPendingWrites,
    };
  }

  if (metadata.fromCache || metadata.hasPendingWrites) {
    return {
      status:"waiting",
      resolved:Boolean(currentClient),
      replaceClient:false,
      client:currentClient,
      metadata,
      serverConfirmed:false,
      needsServerConfirmation:metadata.fromCache && !metadata.hasPendingWrites && !currentClient,
    };
  }

  return {
    status:"confirming",
    resolved:Boolean(currentClient),
    replaceClient:false,
    client:currentClient,
    metadata,
    serverConfirmed:false,
    needsServerConfirmation:true,
  };
}

export function resolveClientDirectConfirmation({ snapshot = null, error = null, currentClient = null }) {
  if (error) {
    return {
      status:currentClient ? "available" : "unavailable",
      resolved:Boolean(currentClient),
      replaceClient:false,
      client:currentClient,
      serverConfirmed:false,
    };
  }

  if (snapshot?.exists?.()) {
    return {
      status:"available",
      resolved:true,
      replaceClient:true,
      client:{ id:snapshot.id, ...snapshot.data() },
      serverConfirmed:true,
    };
  }

  return {
    status:"absent",
    resolved:true,
    replaceClient:true,
    client:null,
    serverConfirmed:true,
  };
}
