$files = Get-ChildItem -Path 'E:\Dev\Proyectos\Trimestre\node_modules' -Recurse -Filter '*.node'
foreach ($f in $files) {
  Unblock-File -Path $f.FullName
  # Quitar atributo de bloqueo alternativo (Zone.Identifier)
  $zone = $f.FullName + ':Zone.Identifier'
  if (Test-Path -LiteralPath $zone) {
    Remove-Item -LiteralPath $zone -Force
  }
}
Write-Output ("Unblocked: " + $files.Count + " files")
