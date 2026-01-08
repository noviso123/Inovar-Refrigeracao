from fastapi import APIRouter, HTTPException, Response
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask
import io
import os
from PIL import Image
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/qrcode", tags=["QR Code"])

@router.get("/generate")
def generate_custom_qrcode(data: str, logo_url: str = None):
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        # Usar StyledPilImage para um visual arredondado premium
        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(),
            color_mask=SolidFillColorMask(front_color=(30, 41, 59), back_color=(255, 255, 255))
        ).convert('RGB')

        # Embutir Logo se fornecido ou usar padrão
        logo_path = None
        if logo_url:
             # Tentar baixar se for URL, ou usar local
             if logo_url.startswith("http"):
                 import httpx
                 try:
                     resp = httpx.get(logo_url)
                     if resp.status_code == 200:
                         logo_path = io.BytesIO(resp.content)
                 except: pass
             else:
                 # Logo local? ex: ../frontend-svelte/static/logo.png
                 potential_path = os.path.join(os.getcwd(), "..", "frontend-svelte", "static", logo_url.lstrip("/"))
                 if os.path.exists(potential_path):
                     logo_path = potential_path

        # Fallback para logo padrão se nenhum fornecido
        if not logo_path:
            default_logo = os.path.join(os.getcwd(), "..", "frontend-svelte", "static", "logo.png")
            if os.path.exists(default_logo):
                logo_path = default_logo

        if logo_path:
            logo = Image.open(logo_path)

            # Redimensionar logo (max 20% do QR)
            qr_width, qr_height = img.size
            logo_max_size = int(qr_width * 0.2)
            logo.thumbnail((logo_max_size, logo_max_size), Image.LANCZOS)

            # Centralizar
            logo_width, logo_height = logo.size
            pos = ((qr_width - logo_width) // 2, (qr_height - logo_height) // 2)

            # Colar logo (lidar com transparência)
            if logo.mode == 'RGBA':
                img.paste(logo, pos, logo)
            else:
                img.paste(logo, pos)

        # Buffer para a imagem final
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()

        return Response(content=img_byte_arr, media_type="image/png")

    except Exception as e:
        logger.error(f"Erro ao gerar QR Code: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao gerar QR Code: {str(e)}")
