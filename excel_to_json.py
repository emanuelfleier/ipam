import pandas as pd
import json
import os
import locale

# Establece el idioma para que los nombres de los meses se obtengan en español
try:
    locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
except locale.Error:
    try:
        locale.setlocale(locale.LC_TIME, 'es_ES')
    except locale.Error:
        print("Advertencia: No se pudo establecer la configuración regional en español.")
        locale.setlocale(locale.LC_TIME, '')

month_map = {
    'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4,
    'Mayo': 5, 'Junio': 6, 'Julio': 7, 'Agosto': 8,
    'Septiembre': 9, 'Octubre': 10, 'Noviembre': 11, 'Diciembre': 12
}

month_map_reverse = {v: k for k, v in month_map.items()}

def excel_to_json(excel_file_path, sheet_name, output_json_path):
    """
    Convierte un archivo de Excel a un archivo JSON en un formato específico
    para el dashboard.
    """
    try:
        df = pd.read_excel(excel_file_path, sheet_name=sheet_name, engine="openpyxl")
        
        df.dropna(how='all', inplace=True)
        
        df.rename(columns={
            'PACIENTE': 'paciente',
            'ORIGEN': 'origen',
            'SERVICIO': 'tipo_servicio',
            'PROFESIONAL': 'profesional',
            'Obra social': 'obra_social',
            'Fecha_Realizacion': 'fecha',
            'CANTIDAD': 'cantidad_practicas',
            'ANIO': 'ANIO_manual',
            'MES': 'MES_manual'
        }, inplace=True)
        
        # Proceso de fechas y limpieza de datos
        df['fecha'] = pd.to_datetime(df['fecha'], errors='coerce')
        df.dropna(subset=['fecha'], inplace=True)
        
        # Solución: Extraer el año y mes por número
        df['ANIO'] = df['fecha'].dt.year.astype(str)
        df['MES_NUM'] = df['fecha'].dt.month
        df['MES'] = df['MES_NUM'].map(month_map_reverse)

        df['cantidad_practicas'] = pd.to_numeric(df['cantidad_practicas'], errors='coerce').fillna(0)
        
        # Se agrupa y se ordena usando el año y el número de mes
        df.sort_values(by=['ANIO', 'MES_NUM'], inplace=True)
        
        # --- MODIFICACIÓN CLAVE: Cambiar la estructura del JSON final ---
        dashboard_data = {}
        
        for (year, mes_numerico), month_df in df.groupby(['ANIO', 'MES_NUM'], sort=True):
            full_month_name = month_map_reverse.get(mes_numerico, 'Desconocido')
            
            # Crear el objeto de año si no existe
            if year not in dashboard_data:
                dashboard_data[year] = {}
            
            total_practicas = month_df['cantidad_practicas'].sum()
            pacientes_unicos = month_df['paciente'].nunique()
            promedio_x_paciente = round(total_practicas / pacientes_unicos, 2)
            
            origen = month_df.groupby('origen')['cantidad_practicas'].sum().sort_index()
            tipo_servicio = month_df.groupby('tipo_servicio')['cantidad_practicas'].sum().sort_index()
            profesionales = month_df.groupby('profesional')['cantidad_practicas'].sum().sort_values(ascending=False).head(6)
            obras_sociales = month_df.groupby('obra_social')['cantidad_practicas'].sum().sort_values(ascending=False).head(6)

            dias_semana_map = {'Monday': 'Lunes', 'Tuesday': 'Martes', 'Wednesday': 'Miércoles',
                                 'Thursday': 'Jueves', 'Friday': 'Viernes', 'Saturday': 'Sábado', 'Sunday': 'Domingo'}
            dias_semana = month_df.groupby(month_df['fecha'].dt.day_name().map(dias_semana_map))['cantidad_practicas'].sum().reindex(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], fill_value=0)
            
            frecuencia = month_df.groupby('paciente')['cantidad_practicas'].sum()
            frecuencia_dict = frecuencia.value_counts().to_dict()
            frecuencia_labels = [f'{k} Estudio{"s" if k > 1 else ""}' for k in sorted(frecuencia_dict.keys())]
            frecuencia_data = [frecuencia_dict[k] for k in sorted(frecuencia_dict.keys())]
            
            top_pacientes_df = frecuencia.sort_values(ascending=False).head(10)
            top_pacientes = [{'nombre': nombre, 'cantidad': int(cantidad)} for nombre, cantidad in top_pacientes_df.items()]
            
            # NUEVA AGRUPACIÓN: Evolución de servicios por obra social
            servicio_por_os = {}
            for os_name, os_df in month_df.groupby('obra_social'):
                servicio_por_os[os_name] = {
                    'labels': os_df.groupby('tipo_servicio')['cantidad_practicas'].sum().index.tolist(),
                    'data': os_df.groupby('tipo_servicio')['cantidad_practicas'].sum().values.tolist()
                }

            # Asignar los datos del mes al objeto del año
            dashboard_data[year][full_month_name] = {
                'periodo': f"01 al {month_df['fecha'].max().day} de {full_month_name} de {year}",
                'kpis': {
                    'practicas': int(total_practicas),
                    'pacientes': int(pacientes_unicos),
                    'promedio': promedio_x_paciente
                },
                'origen': {
                    'labels': origen.index.tolist(),
                    'data': origen.values.tolist()
                },
                'tipoServicio': {
                    'labels': tipo_servicio.index.tolist(),
                    'data': tipo_servicio.values.tolist()
                },
                'profesionales': {
                    'labels': profesionales.index.tolist(),
                    'data': profesionales.values.tolist()
                },
                'obrasSociales': {
                    'labels': obras_sociales.index.tolist(),
                    'data': obras_sociales.values.tolist()
                },
                'diasSemana': {
                    'labels': dias_semana.index.tolist(),
                    'data': dias_semana.values.tolist()
                },
                'frecuenciaPacientes': {
                    'labels': frecuencia_labels,
                    'data': frecuencia_data
                },
                'topPacientes': top_pacientes,
                "servicioPorObraSocial": servicio_por_os,
                "meta": {
                    "year": int(year)
                }
            }

        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(dashboard_data, f, ensure_ascii=False, indent=4)
        
        print(f"Conversión exitosa. Archivo JSON guardado en: {output_json_path}")
        print(f"Años procesados: {df['ANIO'].unique().tolist()}")
        print(f"Meses de cada año procesados:")
        for year in df['ANIO'].unique():
            meses_procesados = df[df['ANIO'] == year]['MES'].unique().tolist()
            print(f"   {year}: {', '.join(meses_procesados)}")

    except FileNotFoundError:
        print(f"Error: El archivo '{excel_file_path}' no fue encontrado.")
    except Exception as e:
        print(f"Ocurrió un error: {e}")

current_dir = os.path.dirname(os.path.abspath(__file__))
excel_file_name = 'BASE_DIAG.xlsx'
excel_file_path = os.path.join(current_dir, excel_file_name)
sheet_name = 'datos'       
output_json_path = 'data.json'  

if __name__ == '__main__':
    excel_to_json(excel_file_path, sheet_name, output_json_path)
