from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0005_modelo_tipo_equipo'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PerfilUsuario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rol', models.CharField(
                    choices=[
                        ('ADMIN',          'Administrador'),
                        ('ENCARGADO_OBRA', 'Encargado de Obra'),
                        ('VIEWER',         'Solo Lectura'),
                    ],
                    default='VIEWER',
                    max_length=20,
                    verbose_name='Rol',
                )),
                ('centro_costo', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='usuarios_encargados',
                    to='inventory.centrocosto',
                    verbose_name='Centro de Costo asignado',
                )),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='perfil',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Usuario',
                )),
            ],
            options={
                'verbose_name': 'Perfil de usuario',
                'verbose_name_plural': 'Perfiles de usuario',
            },
        ),
    ]
