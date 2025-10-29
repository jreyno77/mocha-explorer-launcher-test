export function activate(): void {
  // This gets called when the Extension Host starts.
  // You don’t need anything here for your launcher tests.
  console.log('[launcher-test] extension activated');
}

export function deactivate(): void {
  console.log('[launcher-test] extension deactivated');
}
