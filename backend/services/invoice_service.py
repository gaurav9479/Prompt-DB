import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from backend.models.order import Order

def generate_invoice_pdf(order: Order) -> bytes:
    buffer = io.BytesIO()
    

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    story = []
    styles = getSampleStyleSheet()


    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#FF6F00')  
    )
    
    subtitle_style = ParagraphStyle(
        'InvoiceSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#757575')
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#212121'),
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'InvoiceBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#212121')
    )

    bold_body_style = ParagraphStyle(
        'InvoiceBodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#212121')
    )

    right_align_body = ParagraphStyle(
        'RightAlignBody',
        parent=body_style,
        alignment=2  
    )

    right_align_bold = ParagraphStyle(
        'RightAlignBold',
        parent=bold_body_style,
        alignment=2  
    )


    shop_name = order.shop.name if order.shop else "PromptDB Store"
    shop_address = order.shop.address if order.shop else "Online Store"
    shop_phone = order.shop.owner_phone if order.shop else "N/A"
    shop_email = order.shop.owner_email if order.shop else "N/A"

    header_data = [
        [
            Paragraph(f"<b>{shop_name}</b><br/>{shop_address}<br/>Phone: {shop_phone}<br/>Email: {shop_email}", body_style),
            Paragraph("INVOICE", title_style)
        ],
        [
            "",
            Paragraph(f"<b>Invoice #:</b> INV-{order.id:06d}<br/><b>Date:</b> {order.created_at.strftime('%Y-%m-%d %H:%M')}<br/><b>Status:</b> {order.status.upper()}", subtitle_style)
        ]
    ]

    header_table = Table(header_data, colWidths=[300, 230])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,1), 'RIGHT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 20))


    divider = Table([[""]], colWidths=[530])
    divider.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 1.5, colors.HexColor('#FF6F00')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(divider)
    story.append(Spacer(1, 15))


    cust_name = order.customer_name or "Valued Customer"
    cust_email = order.customer_email or "N/A"
    cust_phone = order.customer_phone or "N/A"
    cust_address = order.delivery_address or "N/A"

    customer_data = [
        [
            Paragraph("<b>BILL TO:</b>", section_heading),
            Paragraph("<b>SHIP TO:</b>", section_heading)
        ],
        [
            Paragraph(f"<b>Name:</b> {cust_name}<br/><b>Email:</b> {cust_email}<br/><b>Phone:</b> {cust_phone}", body_style),
            Paragraph(f"<b>Address:</b> {cust_address}", body_style)
        ]
    ]
    customer_table = Table(customer_data, colWidths=[265, 265])
    customer_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(customer_table)
    story.append(Spacer(1, 20))


    table_headers = [
        Paragraph("<b>Item Description</b>", bold_body_style),
        Paragraph("<b>Listed Price</b>", right_align_bold),
        Paragraph("<b>Final Price</b>", right_align_bold),
        Paragraph("<b>Qty</b>", right_align_bold),
        Paragraph("<b>Discount</b>", right_align_bold),
        Paragraph("<b>Total</b>", right_align_bold)
    ]

    item_row = [
        Paragraph(order.product_name, body_style),
        Paragraph(f"Rs. {order.listed_price:,.2f}", right_align_body),
        Paragraph(f"Rs. {order.final_price:,.2f}", right_align_body),
        Paragraph(str(order.quantity), right_align_body),
        Paragraph(f"Rs. {order.discount_given:,.2f}", right_align_body),
        Paragraph(f"Rs. {order.total_amount:,.2f}", right_align_body)
    ]

    table_data = [table_headers, item_row]

    summary_row_sub = [
        "", "", "", "",
        Paragraph("<b>Subtotal:</b>", right_align_body),
        Paragraph(f"Rs. {order.total_amount:,.2f}", right_align_body)
    ]
    summary_row_total = [
        "", "", "", "",
        Paragraph("<b>Total:</b>", right_align_bold),
        Paragraph(f"Rs. {order.total_amount:,.2f}", right_align_bold)
    ]
    
    table_data.append(summary_row_sub)
    table_data.append(summary_row_total)

    items_table = Table(table_data, colWidths=[180, 70, 70, 40, 80, 90])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#FFE0B2')),  # Light orange background for headers
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,1), 0.5, colors.HexColor('#E0E0E0')),
        ('LINEBELOW', (4,2), (5,3), 1, colors.HexColor('#212121')),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 40))

    # 4. Footer Message
    footer_text = Paragraph(
        "<font color='#757575'>Thank you for your business! If you have any questions regarding this invoice, please contact us.<br/>"
        "All transactions are final. System powered by <b>PromptDB</b>.</font>",
        ParagraphStyle('FooterText', parent=body_style, alignment=1)  # Centered
    )
    story.append(footer_text)

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
