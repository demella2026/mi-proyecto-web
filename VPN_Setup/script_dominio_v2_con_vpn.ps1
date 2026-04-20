<#
    Script Dominio + Software + VPN
    Version : 2.0 — Con integración FortiClient VPN
    Cambios vs v1:
      - Opción 0 ahora instala FortiClient VPN ANTES de unir al dominio
      - Nueva opción 7: Instalar/conectar FortiClient VPN (standalone)
      - Verificación de conectividad con DC antes del domain join
      - Compatible con equipos en obras remotas sin conectividad directa a la red corporativa
    Dominio : elecnor.corp
    DC      : 10.0.0.5
    VPN     : 186.67.93.174:443 (SSL-VPN FortiClient 7.4)
#>

$t_logo = @"
----------------------------------------------------------------------------------------------------
---------------------------------------WWWWNNNNNNNNNNWWW--------------------------------------------
-----------------------------WWNXXK00OOOkkkxxxxxxxxxkkkkOO0KXNW-------------------------------------
----------------------WNXKK0Okkxdddddddddddddddddddddddddddddxk0XW----------------------------------
----------------WNXK0OkkxxxxxkkkOOOOOOOOOOOOkkkxxxxddddddddddddddON---------------------------------
-----------WNXK00OOOO0KKXXNNNWWWWWW------WWWWWWNNNNXXK00OkxxdddddxKW--------------------------------
-------WNXXKKKKXNWWW------------------------------------WWNNXK0OkkKNW---------------------------WWWW
---WWNNNXNWW---------------------------------------------------WN0xkkOO00KXXNNWWWWWWWWWWNNNXKKKXNNW-
--WWWW---------------------------------------------------------WKxddddddddddxxkkkkkkkkkkkkO00XNW----
---------------------------------------------------------------NOdddddddddddddddddxxkO0KXNWW--------
---------------------------------------------------------------WKkxxxxxxxxkkkO00KXXNWW--------------
----------------------------------------------------------------WNXXXKXXXNNWWW----------------------
"@

# ══════════════════════════════════════════════════════════════
#  CONFIGURACIÓN GLOBAL
# ══════════════════════════════════════════════════════════════
$dominio       = "elecnor.corp"
$DC_IP         = "10.0.0.5"
$VPN_SERVIDOR  = "186.67.93.174"
$VPN_PUERTO    = "443"

# Rutas en el USB (relativas al directorio donde está el script)
$FortiInstDir  = ".\FortiClientVPN"   # Carpeta con el instalador .exe
$VPNConfigXML  = ".\VPN\elecnor_vpn_config.xml"

# Rutas de FortiClient instalado
$FortiExe      = "C:\Program Files\Fortinet\FortiClient\FortiClient.exe"
$FCConfigExe   = "C:\Program Files\Fortinet\FortiClient\FCConfig.exe"


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN: Verificar si el DC es alcanzable (sin VPN o con VPN)
# ══════════════════════════════════════════════════════════════
function Test-DCAlcanzable {
    $ping = Test-Connection -ComputerName $DC_IP -Count 1 -Quiet -ErrorAction SilentlyContinue
    if ($ping) { return $true }
    try {
        $tcp = Test-NetConnection -ComputerName $DC_IP -Port 389 -WarningAction SilentlyContinue
        return $tcp.TcpTestSucceeded
    } catch { return $false }
}


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN: Instalar FortiClient VPN silenciosamente
# ══════════════════════════════════════════════════════════════
function Instalar-FortiClientVPN {

    # Verificar si ya está instalado
    $instalado = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" `
                                  -ErrorAction SilentlyContinue |
                 Where-Object { $_.DisplayName -like "*FortiClient*" }
    if ($instalado -or (Test-Path $FortiExe)) {
        Write-Host "  FortiClient ya está instalado." -ForegroundColor Green
        return $true
    }

    # Buscar instalador en USB
    $exe = Get-ChildItem -Path $FortiInstDir -Filter "FortiClient*.exe" -ErrorAction SilentlyContinue |
           Select-Object -First 1
    if (-not $exe) {
        Write-Host "  ERROR: No se encontró instalador en '$FortiInstDir'" -ForegroundColor Red
        Write-Host "  Coloque FortiClientVPNSetup_7.4.x_x64.exe en la carpeta FortiClientVPN del USB." -ForegroundColor Yellow
        return $false
    }

    Write-Host "  Instalando FortiClient VPN 7.4 (silencioso, ~2 min)..." -ForegroundColor Yellow
    $proc = Start-Process -FilePath $exe.FullName -ArgumentList "/quiet /norestart" -Wait -PassThru
    if ($proc.ExitCode -eq 0 -or $proc.ExitCode -eq 3010) {
        Write-Host "  FortiClient instalado correctamente." -ForegroundColor Green
        Start-Sleep -Seconds 5  # Dar tiempo a los servicios para iniciar
        return $true
    }
    Write-Host "  Error al instalar FortiClient (código: $($proc.ExitCode))" -ForegroundColor Red
    return $false
}


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN: Importar perfil VPN desde XML
# ══════════════════════════════════════════════════════════════
function Importar-PerfilVPN {

    if (-not (Test-Path $VPNConfigXML)) {
        Write-Host "  Archivo de config no encontrado: $VPNConfigXML" -ForegroundColor Yellow
        Write-Host "  El perfil deberá configurarse manualmente en FortiClient." -ForegroundColor Yellow
        return
    }

    $xmlAbs = (Resolve-Path $VPNConfigXML).Path

    # Intentar con FCConfig.exe
    if (Test-Path $FCConfigExe) {
        $proc = Start-Process -FilePath $FCConfigExe `
                              -ArgumentList "-m vpn -f `"$xmlAbs`" -o import -norestart" `
                              -Wait -PassThru -ErrorAction SilentlyContinue
        if ($proc.ExitCode -eq 0) {
            Write-Host "  Perfil VPN importado correctamente." -ForegroundColor Green
            return
        }
    }

    # Fallback: registro de Windows
    try {
        [xml]$cfg  = Get-Content $xmlAbs
        $con       = $cfg.forticlient_configuration.vpn.sslvpn.connections.connection
        $regPath   = "HKLM:\SOFTWARE\Fortinet\FortiClient\Sslvpn\Tunnels\$($con.name)"
        New-Item -Path $regPath -Force | Out-Null
        Set-ItemProperty -Path $regPath -Name "Server"      -Value $con.server
        Set-ItemProperty -Path $regPath -Name "Description" -Value "VPN Corporativa Elecnor Chile"
        Set-ItemProperty -Path $regPath -Name "promptusername" -Value 1 -Type DWord
        Write-Host "  Perfil VPN registrado via registro de Windows." -ForegroundColor Green
    }
    catch {
        Write-Host "  No se pudo importar perfil automáticamente." -ForegroundColor Yellow
        Write-Host "  Configure manualmente: Servidor $VPN_SERVIDOR Puerto $VPN_PUERTO" -ForegroundColor Cyan
    }
}


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN: Guiar al técnico para conectar la VPN
# ══════════════════════════════════════════════════════════════
function Conectar-VPN {
    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────┐" -ForegroundColor DarkYellow
    Write-Host "  │         CONECTAR VPN - ACCIÓN MANUAL    │" -ForegroundColor Yellow
    Write-Host "  └─────────────────────────────────────────┘" -ForegroundColor DarkYellow
    Write-Host "  1. FortiClient se abrirá ahora" -ForegroundColor White
    Write-Host "  2. Seleccione 'Elecnor Corporativa'" -ForegroundColor Cyan
    Write-Host "  3. Ingrese su usuario y contraseña de dominio" -ForegroundColor Cyan
    Write-Host "  4. Haga clic en CONECTAR" -ForegroundColor Cyan
    Write-Host "  5. Espere el estado VERDE (Conectado)" -ForegroundColor Cyan
    Write-Host ""

    if (Test-Path $FortiExe) {
        Start-Process $FortiExe
    } else {
        Write-Host "  Abra FortiClient manualmente desde el escritorio." -ForegroundColor Yellow
    }

    Start-Sleep -Seconds 3
    Write-Host ""
    $ok = Read-Host "  ¿VPN conectada (estado verde)? (s/n)"
    return ($ok -eq "s" -or $ok -eq "S")
}


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN: Flujo completo VPN → verificar DC
# ══════════════════════════════════════════════════════════════
function Preparar-VPN {

    Clear-Host
    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────┐" -ForegroundColor DarkYellow
    Write-Host "  │     CONFIGURACIÓN VPN FORTI CLIENT      │" -ForegroundColor DarkYellow
    Write-Host "  └─────────────────────────────────────────┘" -ForegroundColor DarkYellow
    Write-Host ""

    # Verificar primero si ya hay conectividad directa (red local corporativa)
    Write-Host "  Verificando conectividad con DC ($DC_IP)..." -ForegroundColor Yellow
    if (Test-DCAlcanzable) {
        Write-Host "  DC alcanzable directamente — VPN no requerida para esta red." -ForegroundColor Green
        Write-Host "  (Si está en una obra remota, considere instalar FortiClient de todas formas)" -ForegroundColor Yellow
        $instDeTodasFormas = Read-Host "  ¿Instalar FortiClient para uso futuro? (s/n)"
        if ($instDeTodasFormas -eq "s" -or $instDeTodasFormas -eq "S") {
            Instalar-FortiClientVPN | Out-Null
            Importar-PerfilVPN
        }
        return $true
    }

    # No hay conectividad — necesita VPN
    Write-Host "  DC no alcanzable. Se requiere VPN para continuar." -ForegroundColor Red
    Write-Host ""

    # Instalar FortiClient
    $instalado = Instalar-FortiClientVPN
    if (-not $instalado) {
        Write-Host "  No se pudo instalar FortiClient. Operación cancelada." -ForegroundColor Red
        return $false
    }

    # Importar perfil
    Importar-PerfilVPN

    # Guiar conexión manual
    $conectado = Conectar-VPN
    if (-not $conectado) {
        Write-Host "  VPN no conectada. No se puede continuar sin acceso al DC." -ForegroundColor Red
        return $false
    }

    # Verificar DC tras VPN
    Write-Host "  Verificando conectividad post-VPN con DC ($DC_IP)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    if (Test-DCAlcanzable) {
        Write-Host ""
        Write-Host "  ✓ VPN activa y DC accesible. Listo para domain join." -ForegroundColor Green
        Write-Host ""
        return $true
    }
    else {
        Write-Host "  ⚠ VPN conectada pero DC aún no responde." -ForegroundColor Red
        Write-Host "  Posible causa: VPN split-tunnel sin ruta al DC, o IP incorrecta." -ForegroundColor Yellow
        $forzar = Read-Host "  ¿Continuar de todas formas? (s/n)"
        return ($forzar -eq "s" -or $forzar -eq "S")
    }
}


# ══════════════════════════════════════════════════════════════
#  MENÚ
# ══════════════════════════════════════════════════════════════
function menu {
    param([string]$titulo = 'Menu')
    Clear-Host
    Write-Host "<==================== $titulo ====================>" -ForegroundColor DarkYellow
    Write-Host "- Presiona" -ForegroundColor Magenta -NoNewline
    Write-Host " '0' " -ForegroundColor Yellow -NoNewline
    Write-Host "para ejecutar script completo (con VPN)" -ForegroundColor Magenta
    Write-Host "================================================" -ForegroundColor DarkYellow
    Write-Host "- Presiona" -ForegroundColor Magenta -NoNewline
    Write-Host " '1' " -ForegroundColor Yellow -NoNewline
    Write-Host "para unir a dominio y cambiar nombre de PC" -ForegroundColor Magenta
    Write-Host "- Presiona" -NoNewline
    Write-Host " '2' " -ForegroundColor Yellow -NoNewline
    Write-Host "para solo unir a dominio"
    Write-Host "- Presiona" -NoNewline
    Write-Host " '3' " -ForegroundColor Yellow -NoNewline
    Write-Host "para solo cambiar nombre de PC"
    Write-Host "================================================" -ForegroundColor DarkYellow
    Write-Host "- Presiona" -NoNewline -ForegroundColor Magenta
    Write-Host " '4' " -ForegroundColor Yellow -NoNewline
    Write-Host "para instalar software desde RED" -ForegroundColor Magenta
    Write-Host "- Presiona" -NoNewline
    Write-Host " '5' " -ForegroundColor Yellow -NoNewline
    Write-Host "para instalar software desde USB"
    Write-Host "================================================" -ForegroundColor DarkYellow
    Write-Host "- Presiona" -NoNewline -ForegroundColor Cyan
    Write-Host " '7' " -ForegroundColor Yellow -NoNewline
    Write-Host "para instalar/conectar FortiClient VPN" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor DarkYellow
    Write-Host "- Presiona" -NoNewline -ForegroundColor Magenta
    Write-Host " '6' " -ForegroundColor Yellow -NoNewline
    Write-Host "para salir y reiniciar equipo" -ForegroundColor Magenta
    Write-Host "================================================" -ForegroundColor DarkYellow
}


# ══════════════════════════════════════════════════════════════
#  INICIO
# ══════════════════════════════════════════════════════════════
Set-LocalUser -Name "localadmincl" -PasswordNeverExpires 1
Clear-Host
Write-Host $t_logo -ForegroundColor DarkYellow
Start-Sleep -Seconds 1
Clear-Host

Write-Host "======================================" -ForegroundColor DarkYellow
Write-Host "Ingrese el nombre de usuario administrador" -NoNewline -ForegroundColor Red
$usuario1 = Read-Host " "
Write-Host "Ingrese la contraseña de" -NoNewline -ForegroundColor Red
Write-Host " $usuario1 " -NoNewline -ForegroundColor Yellow
$pass1 = Read-Host " " -AsSecureString
$username1     = "$dominio\$usuario1"
$credenciales1 = New-Object System.Management.Automation.PSCredential($username1, $pass1)
Write-Host "======================================" -ForegroundColor DarkYellow
Start-Sleep 1
Clear-Host
Write-Host "======================================" -ForegroundColor DarkYellow
Write-Host "Dominio:" -NoNewline
Write-Host " $dominio"  -ForegroundColor Yellow
Write-Host "admin:"    -NoNewline
Write-Host " $usuario1" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor DarkYellow
Start-Sleep -Seconds 2


# ══════════════════════════════════════════════════════════════
#  LOOP DEL MENÚ
# ══════════════════════════════════════════════════════════════
do {
    menu
    Write-Host "Elija una opción o escriba" -NoNewline
    Write-Host " 'q' " -ForegroundColor Yellow -NoNewline
    Write-Host "para salir" -NoNewline
    $inputmenu = Read-Host " "

    switch ($inputmenu) {

        # ──────────────────────────────────────────────────────
        # OPCIÓN 0: Script completo con VPN
        # ──────────────────────────────────────────────────────
        '0' {
            powercfg -change -monitor-timeout-ac 0
            Clear-Host
            Write-Host "(0) Script completo — flujo:" -ForegroundColor Red
            Write-Host " 1/5 - Instalar/Conectar FortiClient VPN (si red remota)"
            Write-Host " 2/5 - Unir computador a dominio"
            Write-Host " 3/5 - Cambiar nombre de computador"
            Write-Host " 4/5 - Instalar software estándar desde RED"
            Write-Host " 5/5 - Reiniciar computador"
            Write-Host ""
            Start-Sleep -Seconds 2

            # 1/5 — VPN (si es necesario)
            Write-Host "(1/5) Preparando VPN..." -ForegroundColor Yellow
            $vpnOk = Preparar-VPN
            if (-not $vpnOk) {
                Write-Host ""
                Write-Host "Proceso cancelado: no hay acceso al DC." -ForegroundColor Red
                Write-Host "Sin acceso al DC no es posible unir al dominio." -ForegroundColor Yellow
                Read-Host "Presione Enter para volver al menú"
                break
            }

            # 2/5 — Domain Join
            Write-Host "(2/5) Uniendo a dominio $dominio..." -ForegroundColor Yellow
            Add-Computer -DomainName $dominio -Credential $credenciales1

            # 3/5 — Rename
            Write-Host "(3/5) Cambiando nombre de computador..." -ForegroundColor Yellow
            $namepc = Read-Host "Ingresar nuevo nombre del computador"
            Rename-Computer -NewName "$namepc" -DomainCredential $credenciales1 -Force
            Start-Sleep 2
            Clear-Host

            # 4/5 — Software desde RED
            Write-Host "(4/5) Instalando software desde RED..." -ForegroundColor Yellow
            Write-Host "Montando disco TI..." -ForegroundColor Red
            New-PSDrive -Name "S" -Root "\\FSCHILE\TI$" -Persist `
                        -PSProvider "FileSystem" -Credential $credenciales1

            Clear-Host
            Write-Host "Creando carpeta Toolkit..." -ForegroundColor Red
            New-Item -Path "C:\Users\localadmincl\Documents" -Name "Toolkit" -ItemType Directory

            $FToolkit = "S:\Software\Toolkit"
            $Destino  = "C:\Users\localadmincl\Documents\Toolkit"
            $Toolkit  = "C:\Users\localadmincl\Documents\Toolkit\Deploy-Application.exe"

            Copy-Item -Path "$FToolkit\*" -Destination $Destino -Recurse
            Write-Host "Ejecutando Toolkit..." -ForegroundColor Red
            Start-Process -FilePath $Toolkit -Wait
            Read-Host "Enter para continuar"
            Write-Host "Removiendo disco TI..." -ForegroundColor Red
            Get-PSDrive S | Remove-PSDrive

            # 5/5 — Reinicio
            Clear-Host
            Write-Host "(5/5) Reiniciando equipo..." -ForegroundColor Yellow
            powercfg -change -monitor-timeout-ac 10
            Restart-Computer -Force
        }

        # ──────────────────────────────────────────────────────
        # OPCIÓN 1: Domain Join + Rename
        # ──────────────────────────────────────────────────────
        '1' {
            Clear-Host
            Write-Host "(1) Verificando conectividad antes del domain join..." -ForegroundColor Yellow
            if (-not (Test-DCAlcanzable)) {
                Write-Host "  DC no accesible. ¿Desea configurar VPN primero?" -ForegroundColor Red
                $usarvpn = Read-Host "  (s/n)"
                if ($usarvpn -eq "s" -or $usarvpn -eq "S") {
                    $vpnOk = Preparar-VPN
                    if (-not $vpnOk) {
                        Read-Host "Presione Enter para volver al menú"
                        break
                    }
                }
            }
            Write-Host "(1) Cambiando nombre y uniéndose al dominio..." -ForegroundColor Red
            $namepc = Read-Host "Ingresar nuevo nombre de PC"
            Add-Computer -DomainName $dominio -Credential $credenciales1
            Rename-Computer -NewName "$namepc" -DomainCredential $credenciales1 -Force
        }

        # ──────────────────────────────────────────────────────
        # OPCIÓN 2: Solo Domain Join
        # ──────────────────────────────────────────────────────
        '2' {
            Clear-Host
            Write-Host "(2) Verificando conectividad..." -ForegroundColor Yellow
            if (-not (Test-DCAlcanzable)) {
                Write-Host "  DC no accesible. ¿Configurar VPN primero? (s/n)" -ForegroundColor Red
                $usarvpn = Read-Host "  "
                if ($usarvpn -eq "s" -or $usarvpn -eq "S") { Preparar-VPN | Out-Null }
            }
            Write-Host "(2) Solo uniendo a dominio..." -ForegroundColor Red
            Add-Computer -DomainName $dominio -Credential $credenciales1
        }

        # ──────────────────────────────────────────────────────
        # OPCIÓN 3: Solo Rename (sin cambios respecto a v1)
        # ──────────────────────────────────────────────────────
        '3' {
            Clear-Host
            Write-Host "(3) Solo cambiando nombre de PC..." -ForegroundColor Red
            $cambionombre = Read-Host "¿PC ya se encuentra en dominio? SI '1' NO '2'"
            switch ($cambionombre) {
                1 {
                    $namepc = Read-Host "Ingresar nuevo nombre de PC"
                    Rename-Computer -NewName "$namepc" -DomainCredential $credenciales1 -Force
                }
                2 {
                    $namepc = Read-Host "Ingresar nuevo nombre de PC"
                    Rename-Computer -NewName "$namepc"
                }
            }
        }

        # ──────────────────────────────────────────────────────
        # OPCIÓN 4: Software desde RED
        # ──────────────────────────────────────────────────────
        '4' {
            powercfg -change -monitor-timeout-ac 0
            Clear-Host
            Write-Host "(4) Instalando software desde RED..." -ForegroundColor Red
            Write-Host "Montando disco TI..." -ForegroundColor Red
            New-PSDrive -Name "S" -Root "\\FSCHILE\TI$" -Persist `
                        -PSProvider "FileSystem" -Credential $credenciales1
            Clear-Host
            New-Item -Path "C:\Users\localadmincl\Documents" -Name "Toolkit" -ItemType Directory
            $FToolkit = "S:\Software\Toolkit"
            $Destino  = "C:\Users\localadmincl\Documents\Toolkit"
            $Toolkit  = "C:\Users\localadmincl\Documents\Toolkit\Deploy-Application.exe"
            Copy-Item -Path "$FToolkit\*" -Destination $Destino -Recurse
            Write-Host "Ejecutando Toolkit..." -ForegroundColor Red
            Start-Process -FilePath $Toolkit -Wait
            Read-Host "Enter para continuar"
            Write-Host "Removiendo disco TI..." -ForegroundColor Red
            Get-PSDrive S | Remove-PSDrive
            Clear-Host
            powercfg -change -monitor-timeout-ac 10
        }

        # ──────────────────────────────────────────────────────
        # OPCIÓN 5: Software desde USB (sin cambios)
        # ──────────────────────────────────────────────────────
        '5' {
            Clear-Host
            Write-Host "(5) Instalando software desde USB..." -ForegroundColor Red
            Start-Process -FilePath ".\Toolkit\Deploy-Application.exe" -Wait
            Read-Host "Enter para continuar"
            powercfg -change -monitor-timeout-ac 10
        }

        # ──────────────────────────────────────────────────────
        # OPCIÓN 6: Salir y reiniciar
        # ──────────────────────────────────────────────────────
        '6' {
            Clear-Host
            Write-Host "(6) Reiniciando equipo..." -ForegroundColor Red
            Restart-Computer
        }

        # ──────────────────────────────────────────────────────
        # OPCIÓN 7: NUEVA — Instalar/Conectar FortiClient VPN
        # ──────────────────────────────────────────────────────
        '7' {
            Clear-Host
            Write-Host "(7) Configuración FortiClient VPN" -ForegroundColor Cyan
            Write-Host ""
            $vpnOk = Preparar-VPN
            if ($vpnOk) {
                Write-Host ""
                Write-Host "  FortiClient VPN listo. Puede continuar con las otras opciones." -ForegroundColor Green
            }
            else {
                Write-Host ""
                Write-Host "  Configuración VPN no completada." -ForegroundColor Yellow
            }
        }
    }

    pause
} until ($inputmenu -eq 'q')
