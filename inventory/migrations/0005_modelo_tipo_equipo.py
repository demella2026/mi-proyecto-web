from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0004_monitor_cc_en_vez_de_empleado"),
    ]

    operations = [
        migrations.AddField(
            model_name="modelo",
            name="tipo_equipo",
            field=models.CharField(
                choices=[
                    ("COMPUTADOR", "Computador / Laptop / Desktop"),
                    ("CELULAR",    "Celular / Tablet"),
                    ("MONITOR",    "Monitor / Pantalla"),
                    ("OTRO",       "Otro"),
                ],
                default="COMPUTADOR",
                max_length=15,
                verbose_name="Tipo de equipo",
                help_text="Categoría del equipo al que corresponde este modelo.",
            ),
        ),
    ]
