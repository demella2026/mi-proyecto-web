from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0003_area_ldap_ou_dn_empleado_email_alter_empleado_area_and_more"),
    ]

    operations = [
        # Agregar campo centro_costo al Monitor
        migrations.AddField(
            model_name="monitor",
            name="centro_costo",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="monitores",
                to="inventory.centrocosto",
                verbose_name="Centro de Costo / Obra asignada",
            ),
        ),
        # Eliminar campo empleado_asignado del Monitor
        migrations.RemoveField(
            model_name="monitor",
            name="empleado_asignado",
        ),
    ]
