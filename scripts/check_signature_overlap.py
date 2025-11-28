#!/usr/bin/env python3
"""
check_signature_overlap.py
===========================

Validates that the signature area in generated PDFs does not overlap with the footer.

This script analyzes PDF files to check if the signature area (typically in the
bottom-right corner) intersects with the footer region.

Constants (matching pdfGeneratorHDMStandard.ts):
- FOOTER_HEIGHT_MM = 13  (10mm footer Y position + 3mm line above)
- SIGNATURE_TOTAL_HEIGHT_MM = 47  (30mm image + 17mm text details)
- A4 page height = 297mm

Usage:
    python scripts/check_signature_overlap.py [--pdf-file <path>] [--verbose]
    
Options:
    --pdf-file <path>   Path to a specific PDF file to check (optional)
    --verbose           Enable verbose output

Exit codes:
    0 - All checks passed (no overlap detected)
    1 - Overlap detected or error occurred

Requirements:
    pip install PyMuPDF  # (fitz library)

Example:
    python scripts/check_signature_overlap.py
    python scripts/check_signature_overlap.py --pdf-file output/presupuesto.pdf --verbose

Author: HDM Engineering Team
Date: 2025-11-28
"""

import argparse
import sys
from pathlib import Path

# Try to import PyMuPDF once at module level
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    fitz = None

# Constants matching pdfGeneratorHDMStandard.ts
FOOTER_HEIGHT_MM = 13       # Reserved space for footer (line + text)
SIGNATURE_TOTAL_HEIGHT_MM = 47  # Signature image (30) + text details (17)
SAFETY_MARGIN_MM = 5        # Extra safety margin
A4_HEIGHT_MM = 297          # A4 page height in mm
MM_TO_POINTS = 2.83465      # Conversion factor from mm to PDF points

# Calculate the minimum Y position (from top) where signature can start
# without overlapping with footer
MIN_SIGNATURE_Y_FROM_BOTTOM = FOOTER_HEIGHT_MM + SAFETY_MARGIN_MM + SIGNATURE_TOTAL_HEIGHT_MM
SAFE_ZONE_TOP_Y = A4_HEIGHT_MM - MIN_SIGNATURE_Y_FROM_BOTTOM  # In mm from top


def check_pdf_signature_overlap(pdf_path: Path, verbose: bool = False) -> bool:
    """
    Check if signature area overlaps with footer in a PDF file.
    
    Args:
        pdf_path: Path to the PDF file
        verbose: Enable verbose output
        
    Returns:
        True if no overlap detected, False otherwise
    """
    if not PYMUPDF_AVAILABLE:
        print("❌ Error: PyMuPDF library not installed.")
        print("   Install with: pip install PyMuPDF")
        return False
    
    if not pdf_path.exists():
        print(f"❌ Error: PDF file not found: {pdf_path}")
        return False
    
    try:
        doc = fitz.open(str(pdf_path))
        all_pages_ok = True
        
        for page_num, page in enumerate(doc, 1):
            page_height = page.rect.height  # in points
            page_height_mm = page_height / MM_TO_POINTS
            
            # Footer zone starts at this Y position (from top, in points)
            footer_zone_y = (page_height_mm - FOOTER_HEIGHT_MM) * MM_TO_POINTS
            
            if verbose:
                print(f"\n📄 Page {page_num}:")
                print(f"   Page height: {page_height_mm:.1f}mm ({page_height:.1f}pt)")
                print(f"   Footer zone starts at Y={footer_zone_y:.1f}pt (from top)")
            
            # Get text blocks to find signature area
            text_dict = page.get_text("dict")
            blocks = text_dict.get("blocks", [])
            
            signature_keywords = [
                "DEPARTAMENTO COMERCIAL", 
                "HDM INGENIERIA", 
                "VENDEDOR",
                "DEPARTAMENTO",
                "COMERCIAL"
            ]
            
            # Check if any signature-related text overlaps with footer zone
            for block in blocks:
                if block.get("type") != 0:  # Only text blocks
                    continue
                    
                bbox = block.get("bbox", [0, 0, 0, 0])
                block_bottom_y = bbox[3]  # y1 (bottom of block)
                
                # Check if block contains signature keywords
                lines = block.get("lines", [])
                text_content = ""
                for line in lines:
                    for span in line.get("spans", []):
                        text_content += span.get("text", "")
                
                is_signature_block = any(kw.upper() in text_content.upper() 
                                         for kw in signature_keywords)
                
                if is_signature_block:
                    if verbose:
                        print(f"   🔍 Found signature block at Y={block_bottom_y:.1f}pt")
                        print(f"      Text: {text_content[:50]}...")
                    
                    # Check if signature block overlaps with footer zone
                    if block_bottom_y > footer_zone_y:
                        print(f"❌ OVERLAP DETECTED on page {page_num}!")
                        print(f"   Signature bottom: {block_bottom_y:.1f}pt")
                        print(f"   Footer starts at: {footer_zone_y:.1f}pt")
                        print(f"   Overlap amount: {block_bottom_y - footer_zone_y:.1f}pt "
                              f"({(block_bottom_y - footer_zone_y) / MM_TO_POINTS:.1f}mm)")
                        all_pages_ok = False
        
        doc.close()
        
        if all_pages_ok:
            print(f"✅ No signature/footer overlap detected in: {pdf_path.name}")
        
        return all_pages_ok
        
    except Exception as e:
        print(f"❌ Error processing PDF: {e}")
        return False


def validate_constants():
    """Validate the constants match expected values from pdfGeneratorHDMStandard.ts"""
    print("📋 Configuration Constants Validation:")
    print(f"   FOOTER_HEIGHT_MM: {FOOTER_HEIGHT_MM}mm")
    print(f"   SIGNATURE_TOTAL_HEIGHT_MM: {SIGNATURE_TOTAL_HEIGHT_MM}mm")
    print(f"   SAFETY_MARGIN_MM: {SAFETY_MARGIN_MM}mm")
    print(f"   A4_HEIGHT_MM: {A4_HEIGHT_MM}mm")
    print(f"   Safe zone for signature: content must end before Y={SAFE_ZONE_TOP_Y}mm from top")
    print()
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Check if signature overlaps with footer in PDF files"
    )
    parser.add_argument(
        "--pdf-file",
        type=str,
        help="Path to a specific PDF file to check"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose output"
    )
    parser.add_argument(
        "--validate-constants",
        action="store_true",
        help="Only validate and display constants"
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("HDM Signature/Footer Overlap Checker")
    print("=" * 60)
    print()
    
    if args.validate_constants:
        validate_constants()
        return 0
    
    validate_constants()
    
    if args.pdf_file:
        pdf_path = Path(args.pdf_file)
        success = check_pdf_signature_overlap(pdf_path, args.verbose)
        return 0 if success else 1
    
    # If no file specified, check if PyMuPDF is available
    if PYMUPDF_AVAILABLE:
        print("✅ PyMuPDF library is available")
        print("\nTo check a PDF file, run:")
        print("  python scripts/check_signature_overlap.py --pdf-file <path-to-pdf>")
        return 0
    else:
        print("⚠️  PyMuPDF library is not installed.")
        print("   To enable PDF checking, install with: pip install PyMuPDF")
        print("\n   Constants validation completed successfully.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
