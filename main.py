from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import database
import datetime

database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Pink Finance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

class TransacaoBase(BaseModel):
    tipo: str
    descricao: str
    valor: float
    categoria: str

class TransacaoResponse(TransacaoBase):
    id: int
    data: datetime.date
    class Config:
        from_attributes = True

class MetaBase(BaseModel):
    nome: str
    valor_alvo: float
    data_limite: datetime.date
    icone: str

class MetaResponse(MetaBase):
    id: int
    class Config:
        from_attributes = True

@app.post("/transacoes/", response_model=TransacaoResponse)
def criar_transacao(transacao: TransacaoBase, db: Session = Depends(get_db)):
    nova_transacao = database.Transacao(
        tipo=transacao.tipo,
        descricao=transacao.descricao,
        valor=transacao.valor,
        categoria=transacao.categoria
    )
    db.add(nova_transacao)
    db.commit()
    db.refresh(nova_transacao)
    return nova_transacao

@app.get("/transacoes/", response_model=List[TransacaoResponse])
def listar_transacoes(db: Session = Depends(get_db)):
    return db.query(database.Transacao).all()

@app.post("/metas/", response_model=MetaResponse)
def criar_meta(meta: MetaBase, db: Session = Depends(get_db)):
    nova_meta = database.MetaMensal(
        nome=meta.nome,
        valor_alvo=meta.valor_alvo,
        data_limite=meta.data_limite,
        icone=meta.icone
    )
    db.add(nova_meta)
    db.commit()
    db.refresh(nova_meta)
    return nova_meta

@app.get("/metas/", response_model=List[MetaResponse])
def listar_metas(db: Session = Depends(get_db)):
    return db.query(database.MetaMensal).all()