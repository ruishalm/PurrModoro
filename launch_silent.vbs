Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
electronExe = fso.BuildPath(projectDir, "node_modules\electron\dist\electron.exe")

If Not fso.FileExists(electronExe) Then
  MsgBox "Dependencias nao encontradas. Execute install_purrmodoro.bat primeiro!", vbExclamation, "PurrModoro"
  WScript.Quit 1
End If

Set procEnv = shell.Environment("PROCESS")
procEnv("ELECTRON_RUN_AS_NODE") = ""
shell.CurrentDirectory = projectDir
shell.Run Chr(34) & electronExe & Chr(34) & " " & Chr(34) & projectDir & Chr(34), 0, False
