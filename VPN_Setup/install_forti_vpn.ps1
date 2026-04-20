<#
.SYNOPSIS
    Instala FortiClient VPN 7.4 silenciosamente e importa el perfil de Elecnor Chile.

.DESCRIPTION
    Este script realiza las siguientes acciones:
    1. Verifica si FortiClient VPN ya está instalado
    2. Instala FortiClient VPN 7.4 en modo silencioso desde el USB
    3. Espera a que los servicios de FortiClient inicien
    4. Importa el perfil VPN preconfigurado (elecnor_vpn_config.xml)
    5. Abre FortiClient para que el técnico conecte la VPN

.NOTAS
    - El instalador debe estar en .\FortiClientVPN\FortiClientVPNSetup_7.4.x_x64.exe
    - Este script debe ejecutarse con privilegios de Administrador
    - Después de ejecutar, el técnico debe conectar la VPN manualmente antes de unir al dominio
#>

#Requires -RunAsAdministrator

# ══════════════════════════════════════════════════════════════
#  VARIABLES DE CONFIGURACIÓN
# ══════════════════════════════════════════════════════════════

# Ruta al instalador (relativa al USB — ajustar si el nombre del ejecutable varía)
$InstaladorDir  = ".\FortiClientVPN"
$ConfigXML      = ".\VPN\elecnor_vpn_config.xml"

# Rutas de instalación de FortiClient
$FortiClientExe = "C:\Program Files\Fortinet\FortiClient\FortiClient.exe"
$FCConfigExe    = "C:\Program Files\Fortinet\FortiClient\FCConfig.exe"

# Nombre del servicio de FortiClient
$FortiServicio  = "FortiClient"


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN: Escribir log con timestamp
# ══════════════════════════════════════════════════════════════
function Write-Log {
    param([string]$Mensaje, [string]$Color = "White")
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] $Mensaje" -ForegroundColor $Color
}


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN: Verificar si FortiClient ya está instalado
# ══════════════════════════════════════════════════════════════
function Test-FortiClientInstalado {
    # Busca en registro de programas instalados
    $regPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    foreach ($path in $regPaths) {
        $instalado = Get-ItemProperty $path -ErrorAction SilentlyContinue |
                     Where-Object { $_.DisplayName -like "*FortiClient*" }
        if ($instalado) { return $true }
    }
    return (Test-Path $FortiClientExe)
}


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN: Encontrar el instalador en el USB
# ══════════════════════════════════════════════════════════════
function Find-Instalador {
    # Busca cualquier ejecutable de FortiClientVPN en la carpeta
    $exe = Get-ChildItem -Path $InstaladorDir -Filter "FortiClient*.exe" -ErrorAction SilentlyContinue |
           Select-Object -First 1
    if (-not $exe) {
        # Intenta buscar en el directorio actual también
        $exe = Get-ChildItem -Path "." -Filter "FortiClient*.exe" -ErrorAction SilentlyContinue |
               Select-Object -First 1
    }
    return $exe
}


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN: Instalar FortiClient VPN silenciosamente
# ══════════════════════════════════════════════════════════════
function Install-FortiClientVPN {

    # Verificar si ya está instalado
    if (Test-FortiClientInstalado) {
        Write-Log "FortiClient VPN ya está instalado en este equipo." "Green"
        return $true
    }

    # Buscar instalador
    $instalador = Find-Instalador
    if (-not $instalador) {
        Write-Log "ERROR: No se encontró el instalador de FortiClient en '$InstaladorDir'" "Red"
        Write-Log "Asegúrese de que el ejecutable esté en la carpeta FortiClientVPN del USB." "Yellow"
        return $false
    }

    Write-Log "Instalador encontrado: $($instalador.FullName)" "Cyan"
    Write-Log "Instalando FortiClient VPN 7.4 en modo silencioso..." "Yellow"
    Write-Log "Esto puede tardar 2-3 minutos, por favor espere..." "Yellow"

    try {
        # Instalación silenciosa — no muestra ventanas, no reinicia automáticamente
        $proc = Start-Process -FilePath $instalador.FullName `
                              -ArgumentList "/quiet /norestart" `
                              -Wait `
                              -PassThru `
                              -ErrorAction Stop

        if ($proc.ExitCode -eq 0 -or $proc.ExitCode -eq 3010) {
            Write-Log "FortiClient VPN instalado exitosamente (código: $($proc.ExitCode))" "Green"
            # Código 3010 = instalado pero requiere reinicio (ignoramos el reinicio por ahora)
            return $true
        }
        else {
            Write-Log "La instalación retornó código: $($proc.ExitCode)" "Red"
            Write-Log "Intente instalar manualmente desde: $($instalador.FullName)" "Yellow"
            return $false
        }
    }
    catch {
        Write-Log "ERROR durante la instalación: $($_.Exception.Message)" "Red"
        return $false
    }
}


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN: Esperar a que los servicios de FortiClient inicien
# ══════════════════════════════════════════════════════════════
function Wait-FortiService {
    Write-Log "Esperando que los servicios de FortiClient inicien..." "Yellow"
    $intentos = 0
    $maxIntentos = 30  # 30 × 2s = 60 segundos máximo

    do {
        Start-Sleep -Seconds 2
        $servicio = Get-Service -Name $FortiServicio -ErrorAction SilentlyContinue
        $intentos++

        if ($servicio -and $servicio.Status -eq "Running") {
            Write-Log "Servicio FortiClient activo." "Green"
            return $true
        }

        # FortiClient podría tener otro nombre de servicio en algunas versiones
        $servAlt = Get-Service | Where-Object { $_.Name -like "*Forti*" -and $_.Status -eq "Running" }
        if ($servAlt) {
            Write-Log "Servicio detectado: $($servAlt.Name)" "Green"
            return $true
        }

    } while ($intentos -lt $maxIntentos)

    Write-Log "Tiempo de espera agotado para el servicio FortiClient." "Yellow"
    return $false
}


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN: Importar perfil VPN desde XML
# ══════════════════════════════════════════════════════════════
function Import-PerfilVPN {

    # Verificar que el XML existe
    if (-not (Test-Path $ConfigXML)) {
        Write-Log "ERROR: No se encontró el archivo de configuración VPN: $ConfigXML" "Red"
        return $false
    }

    $xmlAbsoluto = (Resolve-Path $ConfigXML).Path
    Write-Log "Importando perfil VPN desde: $xmlAbsoluto" "Yellow"

    # MÉTODO 1: FCConfig.exe (FortiClient 7.x)
    if (Test-Path $FCConfigExe) {
        try {
            Write-Log "Usando FCConfig.exe para importar configuración..." "Cyan"
            $proc = Start-Process -FilePath $FCConfigExe `
                                  -ArgumentList "-m vpn -f `"$xmlAbsoluto`" -o import -norestart" `
                                  -Wait -PassThru -ErrorAction Stop
            if ($proc.ExitCode -eq 0) {
                Write-Log "Perfil VPN importado correctamente via FCConfig." "Green"
                return $true
            }
        }
        catch {
            Write-Log "FCConfig falló: $($_.Exception.Message)" "Yellow"
        }
    }

    # MÉTODO 2: Registro de Windows (fallback universal)
    Write-Log "Usando registro de Windows como método alternativo..." "Cyan"
    try {
        # Leer datos del XML para extraer nombre y servidor
        [xml]$config = Get-Content $xmlAbsoluto
        $conexion = $config.forticlient_configuration.vpn.sslvpn.connections.connection
        $nombre   = $conexion.name
        $servidor = $conexion.server

        $regBase = "HKLM:\SOFTWARE\Fortinet\FortiClient\Sslvpn\Tunnels\$nombre"
        New-Item -Path $regBase -Force | Out-Null
        Set-ItemProperty -Path $regBase -Name "Server"      -Value $servidor
        Set-ItemProperty -Path $regBase -Name "Description" -Value "VPN Corporativa Elecnor Chile"
        Set-ItemProperty -Path $regBase -Name "promptusername" -Value 1 -Type DWord
        Set-ItemProperty -Path $regBase -Name "promptcertificate" -Value 0 -Type DWord
        Set-ItemProperty -Path $regBase -Name "ServerCert"  -Value "1"

        Write-Log "Perfil '$nombre' registrado correctamente via registro." "Green"
        return $true
    }
    catch {
        Write-Log "ERROR al escribir en registro: $($_.Exception.Message)" "Red"
        return $false
    }
}


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN: Abrir FortiClient y guiar al técnico
# ══════════════════════════════════════════════════════════════
function Open-FortiClientVPN {
    Write-Log ""
    Write-Log "══════════════════════════════════════════════" "DarkYellow"
    Write-Log "  ACCIÓN REQUERIDA DEL TÉCNICO" "Yellow"
    Write-Log "══════════════════════════════════════════════" "DarkYellow"
    Write-Log ""
    Write-Log "  FortiClient VPN se abrirá ahora." "White"
    Write-Log "  Siga estos pasos:" "White"
    Write-Log ""
    Write-Log "  1. Seleccione 'Elecnor Corporativa'" "Cyan"
    Write-Log "  2. Ingrese su usuario de dominio (ej: jperez)" "Cyan"
    Write-Log "  3. Ingrese su contraseña de dominio" "Cyan"
    Write-Log "  4. Haga clic en CONECTAR" "Cyan"
    Write-Log "  5. Espere hasta ver el estado 'Conectado'" "Cyan"
    Write-Log ""
    Write-Log "  NOTA: Si el certificado da error, haga clic en 'Continuar'" "Yellow"
    Write-Log "══════════════════════════════════════════════" "DarkYellow"
    Write-Log ""

    # Abrir FortiClient
    if (Test-Path $FortiClientExe) {
        Start-Process $FortiClientExe
    }
    else {
        # Intentar abrir desde menú inicio
        $fcShortcut = Get-ChildItem "$env:ProgramData\Microsoft\Windows\Start Menu" `
                                    -Filter "FortiClient*" -Recurse -ErrorAction SilentlyContinue |
                      Select-Object -First 1
        if ($fcShortcut) {
            Start-Process $fcShortcut.FullName
        }
        else {
            Write-Log "Abra FortiClient manualmente desde el escritorio o menú inicio." "Yellow"
        }
    }
}


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN: Verificar conectividad con el Domain Controller
# ══════════════════════════════════════════════════════════════
function Test-DCConectividad {
    param([string]$DCIP = "10.0.0.5")

    Write-Log "Verificando conectividad con el Domain Controller ($DCIP)..." "Yellow"

    # Test ping básico
    $ping = Test-Connection -ComputerName $DCIP -Count 2 -Quiet -ErrorAction SilentlyContinue
    if ($ping) {
        Write-Log "✓ DC alcanzable en $DCIP" "Green"
        return $true
    }

    # Test puerto LDAP 389 (alternativo)
    try {
        $tcp = Test-NetConnection -ComputerName $DCIP -Port 389 -WarningAction SilentlyContinue
        if ($tcp.TcpTestSucceeded) {
            Write-Log "✓ Puerto LDAP (389) accesible en $DCIP" "Green"
            return $true
        }
    }
    catch { }

    Write-Log "✗ No se puede alcanzar el DC en $DCIP" "Red"
    return $false
}


# ══════════════════════════════════════════════════════════════
#  BLOQUE PRINCIPAL
# ══════════════════════════════════════════════════════════════

Clear-Host
Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor DarkYellow
Write-Host "║   INSTALACIÓN FORTI CLIENT VPN - ELECNOR    ║" -ForegroundColor DarkYellow
Write-Host "║              Versión 7.4 SSL-VPN             ║" -ForegroundColor DarkYellow
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor DarkYellow
Write-Host ""

# Paso 1: Instalar FortiClient
$instalado = Install-FortiClientVPN
if (-not $instalado) {
    Write-Host ""
    Write-Log "No se pudo instalar FortiClient VPN. Proceso detenido." "Red"
    Read-Host "Presione Enter para salir"
    exit 1
}

# Paso 2: Esperar servicios
Start-Sleep -Seconds 3
Wait-FortiService | Out-Null

# Paso 3: Importar perfil VPN
$perfilOk = Import-PerfilVPN
if (-not $perfilOk) {
    Write-Log "No se pudo importar el perfil automáticamente." "Yellow"
    Write-Log "Deberá configurar la VPN manualmente en FortiClient:" "Yellow"
    Write-Log "  Servidor: 186.67.93.174   Puerto: 443" "Cyan"
}

# Paso 4: Abrir FortiClient para que el técnico conecte
Open-FortiClientVPN
Start-Sleep -Seconds 3

# Paso 5: Esperar confirmación del técnico
Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor DarkYellow
$confirmacion = Read-Host "¿La VPN está CONECTADA y aparece en verde? (s/n)"
Write-Host "════════════════════════════════════════" -ForegroundColor DarkYellow

if ($confirmacion -eq "s" -or $confirmacion -eq "S") {
    # Paso 6: Verificar que el DC es accesible
    $dcOk = Test-DCConectividad -DCIP "10.0.0.5"

    if ($dcOk) {
        Write-Log ""
        Write-Log "══════════════════════════════════════════" "Green"
        Write-Log "  VPN CONECTADA Y DC ALCANZABLE" "Green"
        Write-Log "  Puede proceder con el Domain Join." "Green"
        Write-Log "══════════════════════════════════════════" "Green"
        Write-Log ""
        exit 0  # Éxito — el script llamante puede continuar con domain join
    }
    else {
        Write-Log ""
        Write-Log "ATENCIÓN: VPN reportada como conectada pero DC no responde." "Red"
        Write-Log "Posibles causas:" "Yellow"
        Write-Log "  - VPN conectada pero en split-tunnel sin ruta al DC" "Yellow"
        Write-Log "  - Firewall del FortiGate bloqueando tráfico interno" "Yellow"
        Write-Log "  - IP del DC incorrecta (actualmente: 10.0.0.5)" "Yellow"
        Write-Log ""
        $forzar = Read-Host "¿Desea continuar de todas formas? (s/n)"
        if ($forzar -eq "s" -or $forzar -eq "S") { exit 0 }
        else { exit 2 }
    }
}
else {
    Write-Log "VPN no conectada. Operación cancelada." "Red"
    Write-Log "Conecte la VPN antes de unir el equipo al dominio." "Yellow"
    exit 3
}
