from django.core.management.base import BaseCommand
from inventory.models import (
    Empleado, Marca, Modelo, Procesador, Ram, Almacenamiento, Laptop, Celular, Area, Empleado
)


class Command(BaseCommand):
    help = 'Carga datos iniciales de ejemplo en la base de datos'

    def handle(self, *args, **options):
        self.stdout.write('📦 Cargando datos iniciales...\n')
        # ── ÁREAS Y EMPLEADOS ──
        area_it, _ = Area.objects.get_or_create(nombre="Sistemas", defaults={'descripcion': 'Departamento de TI'})

        Empleado.objects.get_or_create(
            email="admin@empresa.com",
            defaults={
                'nombre': "Administrador General",
                'cargo': "Jefe de TI",
                'area': area_it,
                'activo': True
            }
        )
        # ── MARCAS ──
        marcas_data = ['HP', 'Dell', 'Lenovo', 'Apple', 'Samsung', 'Xiaomi', 'Motorola']
        marcas = {}
        for nombre in marcas_data:
            obj, created = Marca.objects.get_or_create(nombre=nombre)
            marcas[nombre] = obj
            if created:
                self.stdout.write(f'  ✅ Marca: {nombre}')

        # ── MODELOS ──
        modelos_data = [
            ('HP', 'ProBook 450 G10'),
            ('HP', 'EliteBook 840 G9'),
            ('Dell', 'Latitude 5540'),
            ('Dell', 'Inspiron 15 3520'),
            ('Lenovo', 'ThinkPad T14 Gen 4'),
            ('Lenovo', 'IdeaPad 3'),
            ('Apple', 'MacBook Air M2'),
            ('Apple', 'MacBook Pro 14 M3'),
            ('Apple', 'iPhone 15'),
            ('Apple', 'iPhone 14'),
            ('Samsung', 'Galaxy S24'),
            ('Samsung', 'Galaxy A54'),
            ('Xiaomi', 'Redmi Note 13'),
            ('Xiaomi', 'Poco X6'),
            ('Motorola', 'Moto G54'),
        ]
        modelos = {}
        for marca_nombre, modelo_nombre in modelos_data:
            obj, created = Modelo.objects.get_or_create(
                nombre=modelo_nombre,
                marca=marcas[marca_nombre],
            )
            modelos[modelo_nombre] = obj
            if created:
                self.stdout.write(f'  ✅ Modelo: {marca_nombre} → {modelo_nombre}')

        # ── PROCESADORES ──
        procesadores_data = [
            'Intel Core i5-1335U',
            'Intel Core i7-1365U',
            'Intel Core i5-1235U',
            'Intel Core i7-1255U',
            'AMD Ryzen 5 7530U',
            'AMD Ryzen 7 7730U',
            'Apple M2',
            'Apple M3',
        ]
        procesadores = {}
        for nombre in procesadores_data:
            obj, created = Procesador.objects.get_or_create(nombre=nombre)
            procesadores[nombre] = obj
            if created:
                self.stdout.write(f'  ✅ Procesador: {nombre}')

        # ── RAM ──
        rams_data = ['4 GB', '8 GB', '16 GB', '32 GB']
        rams = {}
        for cap in rams_data:
            obj, created = Ram.objects.get_or_create(capacidad=cap)
            rams[cap] = obj
            if created:
                self.stdout.write(f'  ✅ RAM: {cap}')

        # ── ALMACENAMIENTO ──
        almacs_data = ['128 GB SSD', '256 GB SSD', '512 GB SSD', '1 TB SSD', '1 TB HDD']
        almacs = {}
        for cap in almacs_data:
            obj, created = Almacenamiento.objects.get_or_create(capacidad=cap)
            almacs[cap] = obj
            if created:
                self.stdout.write(f'  ✅ Almacenamiento: {cap}')

        # ── LAPTOPS DE EJEMPLO ──
        laptops_data = [
            ('SN-LP-001', 'ProBook 450 G10', 'Intel Core i5-1335U', '8 GB', '256 GB SSD', 'ACTIVO'),
            ('SN-LP-002', 'EliteBook 840 G9', 'Intel Core i7-1365U', '16 GB', '512 GB SSD', 'ACTIVO'),
            ('SN-LP-003', 'Latitude 5540', 'Intel Core i5-1235U', '16 GB', '512 GB SSD', 'ACTIVO'),
            ('SN-LP-004', 'ThinkPad T14 Gen 4', 'AMD Ryzen 5 7530U', '16 GB', '256 GB SSD', 'EN_REPARACION'),
            ('SN-LP-005', 'MacBook Air M2', 'Apple M2', '8 GB', '256 GB SSD', 'ACTIVO'),
            ('SN-LP-006', 'MacBook Pro 14 M3', 'Apple M3', '32 GB', '1 TB SSD', 'ACTIVO'),
            ('SN-LP-007', 'IdeaPad 3', 'Intel Core i5-1235U', '8 GB', '256 GB SSD', 'BAJA'),
            ('SN-LP-008', 'Inspiron 15 3520', 'Intel Core i5-1235U', '8 GB', '512 GB SSD', 'ACTIVO'),
        ]
        for ns, modelo_n, proc_n, ram_n, almac_n, estado in laptops_data:
            modelo_obj = modelos[modelo_n]  # El objeto Modelo que ya creamos

            obj, created = Laptop.objects.get_or_create(
                numero_serie=ns,
                defaults={
                    'marca': modelo_obj.marca,    # <--- ESTA ES LA LÍNEA CLAVE
                    'modelo': modelo_obj,
                    'procesador': procesadores[proc_n],
                    'ram': rams[ram_n],
                    'almacenamiento': almacs[almac_n],
                    'estado': estado,
                },
            )
            if created:
                self.stdout.write(f'  ✅ Laptop: {ns} — {modelo_n}')

        # ── CELULARES DE EJEMPLO ──
        celulares_data = [
            ('SN-CL-001', '350000000000001', 'iPhone 15', '8 GB', '256 GB SSD', 'ACTIVO'),
            ('SN-CL-002', '350000000000002', 'iPhone 14', '8 GB', '128 GB SSD', 'ACTIVO'),
            ('SN-CL-003', '350000000000003', 'Galaxy S24', '8 GB', '256 GB SSD', 'ACTIVO'),
            ('SN-CL-004', '350000000000004', 'Galaxy A54', '8 GB', '128 GB SSD', 'EN_REPARACION'),
            ('SN-CL-005', '350000000000005', 'Redmi Note 13', '8 GB', '256 GB SSD', 'ACTIVO'),
            ('SN-CL-006', '350000000000006', 'Poco X6', '8 GB', '256 GB SSD', 'ACTIVO'),
            ('SN-CL-007', '350000000000007', 'Moto G54', '4 GB', '128 GB SSD', 'BAJA'),
        ]
        for ns, imei, modelo_n, ram_n, almac_n, estado in celulares_data:
            modelo_obj = modelos[modelo_n]

            obj, created = Celular.objects.get_or_create(
                numero_serie=ns,
                defaults={
                    'imei': imei,
                    'marca': modelo_obj.marca,    # <--- TAMBIÉN AQUÍ
                    'modelo': modelo_obj,
                    'ram': rams[ram_n],
                    'almacenamiento': almacs[almac_n],
                    'estado': estado,
                },
            )
            if created:
                self.stdout.write(f'  ✅ Celular: {ns} — {modelo_n}')

        # ── RESUMEN ──
        self.stdout.write('\n' + self.style.SUCCESS(
            '🎉 Datos iniciales cargados:\n'
            f'   Marcas:          {Marca.objects.count()}\n'
            f'   Modelos:         {Modelo.objects.count()}\n'
            f'   Procesadores:    {Procesador.objects.count()}\n'
            f'   RAM:             {Ram.objects.count()}\n'
            f'   Almacenamiento:  {Almacenamiento.objects.count()}\n'
            f'   Laptops:         {Laptop.objects.count()}\n'
            f'   Celulares:       {Celular.objects.count()}'
        ))