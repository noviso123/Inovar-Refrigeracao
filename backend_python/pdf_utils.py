from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import cm
import io
import logging

logger = logging.getLogger(__name__)

def generate_os_pdf(os_data: dict, company_settings: dict):
    """
    Gera um PDF profissional para uma Ordem de Serviço ou Orçamento.
    os_data: dict contendo dados da OS, cliente, equipamentos e itens.
    company_settings: dict com dados da empresa (SystemSettings).
    """
    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        elements = []

        # Estilos Customizados
        header_style = ParagraphStyle(
            'Header',
            parent=styles['Normal'],
            fontSize=16,
            textColor=colors.hexColor("#1e293b"),
            spaceAfter=12,
            alignment=1, # Center
            fontName='Helvetica-Bold'
        )

        subheader_style = ParagraphStyle(
            'SubHeader',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.hexColor("#475569"),
            spaceAfter=6,
            fontName='Helvetica-Bold'
        )

        label_style = ParagraphStyle(
            'Label',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.hexColor("#64748b"),
            fontName='Helvetica-Bold'
        )

        value_style = ParagraphStyle(
            'Value',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.black,
        )

        # 1. Cabeçalho da Empresa
        logo_url = company_settings.get("logo_url")
        # Nota: Imagens remotas no reportlab exigem download prévio ou lib externa.
        # Para evitar quebra, usamos apenas o texto se falhar.

        company_name = company_settings.get("business_name", "Inovar Refrigeração")
        elements.append(Paragraph(company_name, header_style))

        company_info = f"{company_settings.get('email_contact', '')} | {company_settings.get('phone_contact', '')}<br/>"
        company_info += f"{company_settings.get('logradouro', '')}, {company_settings.get('numero', '')} - {company_settings.get('cidade', '')}/{company_settings.get('estado', '')}"
        elements.append(Paragraph(company_info, styles['Normal']))
        elements.append(Spacer(1, 1*cm))

        # 2. Título do Documento
        doc_title = "ORDEM DE SERVIÇO" if os_data.get("status") != "orcamento" else "ORÇAMENTO"
        elements.append(Paragraph(f"{doc_title} #{os_data.get('sequential_id', os_data.get('id', '---'))}", subheader_style))
        elements.append(Paragraph(f"Data: {os_data.get('created_at', '')}", styles['Normal']))
        elements.append(Spacer(1, 0.5*cm))

        # 3. Dados do Cliente
        elements.append(Paragraph("DADOS DO CLIENTE", subheader_style))
        client = os_data.get("client", {})
        client_data = [
            [Paragraph("Nome:", label_style), Paragraph(client.get("name", ""), value_style)],
            [Paragraph("CPF/CNPJ:", label_style), Paragraph(client.get("document", ""), value_style)],
            [Paragraph("Telefone:", label_style), Paragraph(client.get("phone", ""), value_style)],
        ]
        t_client = Table(client_data, colWidths=[4*cm, 12*cm])
        t_client.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ]))
        elements.append(t_client)
        elements.append(Spacer(1, 0.5*cm))

        # 4. Detalhes do Serviço / Equipamento
        elements.append(Paragraph("DETALHES DO SERVIÇO", subheader_style))
        equipment = os_data.get("equipment", {})
        service_data = [
            [Paragraph("Equipamento:", label_style), Paragraph(equipment.get("name", "---"), value_style)],
            [Paragraph("Marca/Modelo:", label_style), Paragraph(f"{equipment.get('brand','')} / {equipment.get('model','')}", value_style)],
            [Paragraph("Descrição:", label_style), Paragraph(os_data.get("description", ""), value_style)],
        ]
        t_service = Table(service_data, colWidths=[4*cm, 12*cm])
        t_service.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ]))
        elements.append(t_service)
        elements.append(Spacer(1, 0.5*cm))

        # 5. Itens e Valores
        elements.append(Paragraph("ITENS DO SERVIÇO", subheader_style))
        items = os_data.get("itens_os", [])
        if items:
            table_data = [['Descrição', 'Qtd', 'Unitário', 'Total']]
            for item in items:
                table_data.append([
                    item.get("descricao_tarefa", ""),
                    str(item.get("quantidade", 1)),
                    f"R$ {item.get('valor_unitario', 0.0):.2f}",
                    f"R$ {item.get('valor_total', 0.0):.2f}"
                ])

            table_data.append(['', '', 'TOTAL:', f"R$ {os_data.get('valor_total', 0.0):.2f}"])

            t_items = Table(table_data, colWidths=[9*cm, 2*cm, 2.5*cm, 2.5*cm])
            t_items.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.hexColor("#f1f5f9")),
                ('TEXTCOLOR', (0,0), (-1,0), colors.hexColor("#1e293b")),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('ALIGN', (1,0), (-1,-1), 'CENTER'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                ('GRID', (0,0), (-1,-2), 0.5, colors.grey),
                ('FONTNAME', (-2,-1), (-1,-1), 'Helvetica-Bold'),
            ]))
            elements.append(t_items)
        else:
            elements.append(Paragraph("Nenhum item listado.", styles['Normal']))

        elements.append(Spacer(1, 1*cm))

        # 6. Assinaturas (Se existirem)
        if os_data.get("assinatura_cliente") or os_data.get("assinatura_tecnico"):
             elements.append(Paragraph("ASSINATURAS", subheader_style))
             # Placeholder para fotos de assinaturas (Base64 ou URL)
             elements.append(Paragraph("Documento assinado digitalmente.", styles['Italic']))

        # Gerar PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer.read()

    except Exception as e:
        logger.error(f"Erro ao gerar PDF: {e}")
        return None
