# INSTRUCCIONES USB — PROVISIÓN DE EQUIPOS ELECNOR CHILE
**Guía para Técnicos de Terreno**  
Versión 2.0 — Con integración FortiClient VPN

---

## ⚠️ ANTES DE COMENZAR — VERIFICACIONES OBLIGATORIAS

| # | Verificación | Estado |
|---|---|---|
| 1 | El equipo tiene **Windows 11 Pro** instalado (imagen limpia clonada) | ☐ |
| 2 | El USB tiene **al menos 2 GB libres** y contiene todas las carpetas de este instructivo | ☐ |
| 3 | El equipo tiene **acceso a internet** (aunque sea por hotspot) | ☐ |
| 4 | Tienes a mano tus **credenciales de dominio** (usuario y contraseña elecnor.corp) | ☐ |
| 5 | Conoces el **nombre de equipo** que se asignará (ej: `PC-OBRA-001`) | ☐ |

> **Servidor VPN:** `186.67.93.174:443` (FortiGate SSL-VPN)

---

## 📁 ESTRUCTURA DEL USB

El pendrive debe tener la siguiente estructura de carpetas y archivos:

```
USB:\
│
├── FortiClientVPN\
│   └── FortiClientVPNSetup_7.4.x_x64.exe     ← Instalador FortiClient VPN Only
│
├── VPN\
│   └── elecnor_vpn_config.xml                  ← Perfil VPN preconfigurado
│
├── Toolkit\
│   ├── Deploy-Application.exe                  ← PSADT launcher
│   ├── Deploy-Application.ps1                  ← Script PSADT principal
│   └── [otros archivos del toolkit...]
│
├── script_dominio_v2_con_vpn.ps1               ← Script principal (ESTE ES EL QUE DEBES EJECUTAR)
├── install_forti_vpn.ps1                        ← Script VPN standalone (uso opcional)
└── INSTRUCCIONES_USB.md                         ← Este archivo
```

> **IMPORTANTE:** No mover ni renombrar los archivos. Los scripts usan rutas relativas  
> y dependen de esta estructura exacta.

---

## 🚀 PROCEDIMIENTO PRINCIPAL (Opción recomendada)

### Paso 0 — Preparar el equipo

1. Enciende el equipo con la imagen limpia de Windows 11 Pro.
2. Conecta el USB al equipo.
3. Asegúrate de que el equipo tenga conexión a internet.

---

### Paso 1 — Abrir PowerShell como Administrador

1. Presiona `Win + X`
2. Haz clic en **"Terminal de Windows (Administrador)"** o **"Windows PowerShell (Administrador)"**
3. Si aparece el diálogo de UAC, haz clic en **Sí**

---

### Paso 2 — Navegar al USB y ejecutar el script

En la ventana de PowerShell, escribe los siguientes comandos (reemplaza `D:` con la letra de tu USB):

```powershell
# 1. Ir al USB (ajustar la letra de unidad según corresponda)
cd D:\

# 2. Habilitar la ejecución de scripts para esta sesión
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# 3. Ejecutar el script principal
.\script_dominio_v2_con_vpn.ps1
```

---

### Paso 3 — Menú principal del script

Al ejecutar, verás el siguiente menú:

```
╔══════════════════════════════════════════════════╗
║     GESTIÓN DE DOMINIO - ELECNOR CHILE v2        ║
╚══════════════════════════════════════════════════╝

  [0] Unir equipo al dominio (proceso completo)
  [1] Solo cambiar nombre del equipo
  [2] Solo unir al dominio (nombre ya configurado)
  [3] Instalar software desde red corporativa (\\FSCHILE\TI)
  [4] Verificar estado del dominio
  [5] Configurar DNS corporativo
  [6] Salir
  [7] Instalar / Conectar VPN (FortiClient)
```

**Para un equipo nuevo, elige la opción `0` (proceso completo).**

---

### Paso 4 — Opción 0: Proceso completo (detalle de cada paso)

El script ejecutará automáticamente los siguientes pasos en orden:

#### 4.1 — VPN (Paso 1 de 5)

El script detectará si el Domain Controller (`10.0.0.5`) ya es accesible:

- **Si estás en red local (oficina central):** El DC ya es accesible, se saltará la VPN automáticamente. Continúa en el paso 4.2.
- **Si estás en terreno (obra remota):** El script instalará FortiClient VPN y te guiará para conectarte.

**Si se instala FortiClient:**

1. El script instalará FortiClient VPN silenciosamente (2-3 minutos).
2. Abrirá FortiClient automáticamente.
3. **ACCIÓN MANUAL REQUERIDA:**
   - Selecciona el perfil **"Elecnor Corporativa"**
   - Ingresa tu **usuario de dominio** (ej: `jperez`, sin @elecnor.corp)
   - Ingresa tu **contraseña de dominio**
   - Haz clic en **CONECTAR**
   - Espera hasta ver el estado en **verde** ("Conectado")
4. Regresa a la ventana de PowerShell.
5. Cuando el script pregunte `¿La VPN está CONECTADA y aparece en verde? (s/n)` → escribe `s` y presiona Enter.

> **Si el certificado da advertencia:** Haz clic en "Continuar" o "Conectar de todas formas". Es normal si el FortiGate usa certificado autofirmado.

#### 4.2 — Nombre del equipo (Paso 2 de 5)

El script te pedirá el nombre del equipo. Ejemplo:

```
Ingrese el nuevo nombre del equipo: PC-OBRA-LOS-ANDES-001
```

**Convención de nombres recomendada:**
- Computadores: `PC-[OBRA]-[NRO]` → ej: `PC-LOSANDES-001`
- Laptops: `LT-[OBRA]-[NRO]` → ej: `LT-COQUIMBO-003`
- Usa solo letras, números y guiones. Máximo 15 caracteres.

#### 4.3 — Domain Join (Paso 3 de 5)

El script te pedirá credenciales con permisos para unir equipos al dominio:

```
Usuario administrador del dominio: administrador
Contraseña: ************
```

Usa las credenciales de la cuenta de dominio que tenga permisos de domain join (consulta con el administrador si no las tienes).

#### 4.4 — Configuración DNS (Paso 4 de 5)

El script configurará automáticamente el DNS apuntando al DC (`10.0.0.5`). No requiere acción manual.

#### 4.5 — Reinicio (Paso 5 de 5)

El script solicitará reiniciar el equipo. Confirma con `s`. El equipo se reiniciará y al volver estará unido al dominio `elecnor.corp`.

---

## 🔌 USO STANDALONE DE LA VPN (Opción 7 o script independiente)

Si solo necesitas instalar/conectar la VPN sin hacer domain join (ej: para instalar software corporativo en un equipo ya unido al dominio):

**Método A — Desde el menú principal:**
```
Elige la opción [7] en el menú
```

**Método B — Script independiente:**
```powershell
cd D:\
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
.\install_forti_vpn.ps1
```

---

## ✅ VERIFICACIÓN POST-DOMAIN JOIN

Una vez reiniciado el equipo, verifica que todo quedó correcto:

```powershell
# Verificar que está en el dominio
(Get-WmiObject Win32_ComputerSystem).Domain
# Debe mostrar: elecnor.corp

# Verificar conectividad con DC
Test-NetConnection -ComputerName 10.0.0.5 -Port 389
# TcpTestSucceeded debe ser: True

# Verificar nombre del equipo
$env:COMPUTERNAME
# Debe mostrar el nombre que asignaste
```

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### La VPN no conecta
| Síntoma | Causa probable | Solución |
|---|---|---|
| "No se puede alcanzar el servidor" | IP del FortiGate incorrecta | Verificar IP con administrador de red |
| "Certificado no válido" y no conecta | FortiGate sin cert. de CA | Hacer clic en "Continuar" o ajustar `warn_invalid_server_certificate` a 0 en el XML |
| Conecta pero DC no responde | Split-tunnel sin ruta interna | Verificar en FortiGate que el SSL-VPN portal incluya ruta a 10.0.0.x y DNS push |
| Credenciales incorrectas | Contraseña expirada o usuario bloqueado | Contactar administrador AD |

### El domain join falla
| Síntoma | Causa probable | Solución |
|---|---|---|
| "El servidor RPC no está disponible" | DC no accesible | Verificar VPN conectada y Test-Connection 10.0.0.5 |
| "No se encontró el nombre de dominio" | DNS no apunta al DC | Ejecutar opción 5 del menú para configurar DNS, luego reintentar |
| "El nombre de cuenta ya existe" | Nombre de equipo duplicado | Cambiar el nombre e intentar nuevamente |
| "Acceso denegado" | Credenciales sin permisos de domain join | Usar cuenta de administrador de dominio |

### FortiClient se instala pero no aparece el perfil "Elecnor Corporativa"
El script tiene un método alternativo vía registro de Windows. Si FCConfig.exe falla:
1. Abre FortiClient manualmente.
2. Agrega una nueva conexión VPN SSL.
3. Servidor: `186.67.93.174` Puerto: `443`
4. Conecta normalmente.

---

## 📞 CONTACTOS DE SOPORTE

| Rol | Contacto | Para qué |
|---|---|---|
| Administrador de Red | — | IP real del FortiGate, configuración split-tunnel, DNS push |
| Administrador AD | — | Credenciales domain join, cuentas bloqueadas, OUs |
| Soporte TI Central | — | Problemas con imagen, licencias Windows, FortiClient |

> **Completa esta tabla con los datos reales del equipo antes de distribuir el USB.**

---

## 📋 CHECKLIST FINAL

Antes de entregar el equipo al usuario, confirma:

- [ ] Equipo unido al dominio `elecnor.corp`
- [ ] Nombre del equipo asignado según convención
- [ ] Usuario puede iniciar sesión con su cuenta de dominio
- [ ] GPOs aplicadas (verificar con `gpresult /r` en CMD)
- [ ] FortiClient VPN instalado y perfil "Elecnor Corporativa" visible
- [ ] Software corporativo instalado (si aplica)
- [ ] Registro en sistema de inventario TI actualizado

---

*Documento generado para uso interno de TI — Elecnor Chile*  
*Última actualización: Abril 2026*
