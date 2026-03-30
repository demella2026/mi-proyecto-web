"""
Modelos normalizados para el inventario de equipos TI.
Incluye catálogos base, organización de la empresa y registro de equipos
con asignación a empleados e historial de cambios.
"""

from django.db import models
from simple_history.models import HistoricalRecords


# ═══════════════════════════════════════════════
#  CATÁLOGOS BASE
# ═══════════════════════════════════════════════

class Marca(models.Model):
    """Catálogo de marcas (HP, Dell, Apple, Samsung, etc.)."""
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Nombre de la marca",
    )

    class Meta:
        verbose_name = "Marca"
        verbose_name_plural = "Marcas"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Modelo(models.Model):
    """
    Catálogo de modelos de equipos.
    Cada modelo pertenece a una sola marca.
    """
    marca = models.ForeignKey(
        Marca,
        on_delete=models.CASCADE,
        related_name="modelos",
        verbose_name="Marca",
    )
    nombre = models.CharField(
        max_length=150,
        verbose_name="Nombre del modelo",
    )

    class Meta:
        verbose_name = "Modelo"
        verbose_name_plural = "Modelos"
        ordering = ["marca__nombre", "nombre"]
        constraints = [
            models.UniqueConstraint(
                fields=["marca", "nombre"],
                name="unique_marca_modelo",
            )
        ]

    def __str__(self):
        return f"{self.marca.nombre} {self.nombre}"


class Procesador(models.Model):
    """Catálogo de procesadores (Intel Core i5, Apple M1, Snapdragon 888, etc.)."""
    nombre = models.CharField(
        max_length=150,
        unique=True,
        verbose_name="Procesador",
    )

    class Meta:
        verbose_name = "Procesador"
        verbose_name_plural = "Procesadores"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Ram(models.Model):
    """Catálogo de configuraciones de memoria RAM."""
    capacidad = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Capacidad de RAM",
        help_text="Ejemplo: 8GB, 16GB, 32GB",
    )

    class Meta:
        verbose_name = "RAM"
        verbose_name_plural = "Memorias RAM"
        ordering = ["capacidad"]

    def __str__(self):
        return self.capacidad


class Almacenamiento(models.Model):
    """Catálogo de configuraciones de almacenamiento."""
    capacidad = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Almacenamiento",
        help_text="Ejemplo: 256GB SSD, 1TB HDD, 512GB NVMe",
    )

    class Meta:
        verbose_name = "Almacenamiento"
        verbose_name_plural = "Almacenamientos"
        ordering = ["capacidad"]

    def __str__(self):
        return self.capacidad


# ═══════════════════════════════════════════════
#  ORGANIZACIÓN
# ═══════════════════════════════════════════════

class Area(models.Model):
    """Catálogo de las diferentes áreas o departamentos de la empresa."""
    nombre = models.CharField(
        max_length=100, 
        unique=True,
        verbose_name="Nombre del área"
    )
    descripcion = models.TextField(
        blank=True, 
        default="",
        verbose_name="Descripción"
    )

    class Meta:
        verbose_name = "Área"
        verbose_name_plural = "Áreas"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Empleado(models.Model):
    """Registro de los empleados a los que se les pueden asignar equipos."""
    nombre = models.CharField(
        max_length=200,
        verbose_name="Nombre completo"
    )
    email = models.EmailField(
        unique=True,
        verbose_name="Correo electrónico"
    )
    cargo = models.CharField(
        max_length=150,
        verbose_name="Cargo o puesto"
    )
    area = models.ForeignKey(
        Area, 
        on_delete=models.PROTECT, 
        related_name="empleados",
        verbose_name="Área"
    )
    activo = models.BooleanField(
        default=True,
        verbose_name="Empleado activo",
        help_text="Desmarque esta opción si el empleado ya no trabaja en la empresa."
    )

    class Meta:
        verbose_name = "Empleado"
        verbose_name_plural = "Empleados"
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre} ({self.cargo})"


# ═══════════════════════════════════════════════
#  EQUIPOS
# ═══════════════════════════════════════════════

class EstadoChoices(models.TextChoices):
    """Opciones de estado compartidas por Laptop y Celular."""
    ACTIVO = "activo", "Activo"
    EN_REPARACION = "en_reparacion", "En Reparación"
    DE_BAJA = "de_baja", "De Baja"


class Laptop(models.Model):
    """Registro de computadores portátiles del inventario."""
    numero_serie = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Número de serie",
    )
    marca = models.ForeignKey(
        Marca,
        on_delete=models.PROTECT,
        related_name="laptops",
        verbose_name="Marca",
    )
    modelo = models.ForeignKey(
        Modelo,
        on_delete=models.PROTECT,
        related_name="laptops",
        verbose_name="Modelo",
    )
    procesador = models.ForeignKey(
        Procesador,
        on_delete=models.PROTECT,
        related_name="laptops",
        verbose_name="Procesador",
    )
    ram = models.ForeignKey(
        Ram,
        on_delete=models.PROTECT,
        related_name="laptops",
        verbose_name="RAM",
    )
    almacenamiento = models.ForeignKey(
        Almacenamiento,
        on_delete=models.PROTECT,
        related_name="laptops",
        verbose_name="Almacenamiento",
    )
    estado = models.CharField(
        max_length=20,
        choices=EstadoChoices.choices,
        default=EstadoChoices.ACTIVO,
        verbose_name="Estado",
    )
    empleado_asignado = models.ForeignKey(
        Empleado, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL, 
        related_name="laptops",
        verbose_name="Empleado asignado",
        help_text="Dejar en blanco si el equipo está en bodega."
    )
    fecha_ingreso = models.DateField(
        auto_now_add=True,
        verbose_name="Fecha de ingreso",
    )
    notas = models.TextField(
        blank=True,
        default="",
        verbose_name="Notas adicionales",
    )
    
    # Registro histórico de cambios (simple-history)
    history = HistoricalRecords()

    class Meta:
        verbose_name = "Laptop"
        verbose_name_plural = "Laptops"
        ordering = ["-fecha_ingreso"]

    def __str__(self):
        return f"Laptop {self.marca} {self.modelo} — SN: {self.numero_serie}"


class Celular(models.Model):
    """Registro de celulares del inventario."""
    imei = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="IMEI",
    )
    numero_serie = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Número de serie",
    )
    marca = models.ForeignKey(
        Marca,
        on_delete=models.PROTECT,
        related_name="celulares",
        verbose_name="Marca",
    )
    modelo = models.ForeignKey(
        Modelo,
        on_delete=models.PROTECT,
        related_name="celulares",
        verbose_name="Modelo",
    )
    ram = models.ForeignKey(
        Ram,
        on_delete=models.PROTECT,
        related_name="celulares",
        verbose_name="RAM",
    )
    almacenamiento = models.ForeignKey(
        Almacenamiento,
        on_delete=models.PROTECT,
        related_name="celulares",
        verbose_name="Almacenamiento",
    )
    estado = models.CharField(
        max_length=20,
        choices=EstadoChoices.choices,
        default=EstadoChoices.ACTIVO,
        verbose_name="Estado",
    )
    empleado_asignado = models.ForeignKey(
        Empleado, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL, 
        related_name="celulares",
        verbose_name="Empleado asignado",
        help_text="Dejar en blanco si el equipo está en bodega."
    )
    fecha_ingreso = models.DateField(
        auto_now_add=True,
        verbose_name="Fecha de ingreso",
    )
    notas = models.TextField(
        blank=True,
        default="",
        verbose_name="Notas adicionales",
    )
    
    # Registro histórico de cambios (simple-history)
    history = HistoricalRecords()

    class Meta:
        verbose_name = "Celular"
        verbose_name_plural = "Celulares"
        ordering = ["-fecha_ingreso"]

    def __str__(self):
        return f"Celular {self.marca} {self.modelo} — IMEI: {self.imei}"