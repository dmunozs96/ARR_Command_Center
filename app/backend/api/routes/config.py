"""
Config routes:
  GET  /api/config/products
  POST /api/config/products
  PUT  /api/config/products/{id}
  GET  /api/config/consultants
  PUT  /api/config/consultants/{id}
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.backend.api.schemas import (
    ConsultantOut,
    ConsultantUpdate,
    ProductCreate,
    ProductOut,
    ProductUpdate,
)
from app.backend.db.connection import get_db
from app.backend.db.models import ConsultantCountry, ProductClassification

router = APIRouter()


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

@router.get("/products", response_model=List[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(ProductClassification).order_by(ProductClassification.product_name).all()


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(body: ProductCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(ProductClassification)
        .filter(ProductClassification.product_name == body.product_name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Product name already exists")
    product = ProductClassification(**body.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, body: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(ProductClassification).filter(ProductClassification.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)
    return product


# ---------------------------------------------------------------------------
# Consultants
# ---------------------------------------------------------------------------

@router.get("/consultants", response_model=List[ConsultantOut])
def list_consultants(db: Session = Depends(get_db)):
    return db.query(ConsultantCountry).order_by(ConsultantCountry.consultant_name).all()


@router.put("/consultants/{consultant_id}", response_model=ConsultantOut)
def update_consultant(consultant_id: int, body: ConsultantUpdate, db: Session = Depends(get_db)):
    consultant = db.query(ConsultantCountry).filter(ConsultantCountry.id == consultant_id).first()
    if not consultant:
        raise HTTPException(status_code=404, detail="Consultant not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(consultant, field, value)
    consultant.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(consultant)
    return consultant
