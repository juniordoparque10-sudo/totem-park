export async function promoteNativeCachePartial({ tempPath, finalPath, expectedSizeBytes = 0, statFile, deleteFile, renameFile, validateFile }) {
  const partial = await statFile(tempPath);
  const partialValidation = validateFile(partial?.size,expectedSizeBytes);
  if (!partialValidation.valid) throw new Error(`Arquivo parcial inválido: ${partialValidation.reason}`);

  const currentFinal = await statFile(finalPath);
  const currentValidation = validateFile(currentFinal?.size,expectedSizeBytes);
  if (currentValidation.valid) {
    await deleteFile(tempPath);
    return { fileInfo:{ ...currentFinal, size:currentValidation.actual }, reusedFinal:true };
  }

  if (currentFinal) await deleteFile(finalPath);
  await renameFile(tempPath,finalPath);
  const promoted = await statFile(finalPath);
  const promotedValidation = validateFile(promoted?.size,expectedSizeBytes);
  if (!promotedValidation.valid) throw new Error(`Arquivo promovido inválido: ${promotedValidation.reason}`);
  return { fileInfo:{ ...promoted, size:promotedValidation.actual }, reusedFinal:false };
}
