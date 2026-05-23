from sqlalchemy import create_engine, Column, Integer, String, Float, Date
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./finance.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Transacao(Base):
    __tablename__ = "transacoes"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String, index=True) # "entrada" ou "saida"
    descricao = Column(String)
    valor = Column(Float)
    categoria = Column(String)
    data = Column(Date, default=datetime.date.today)


class MetaMensal(Base):
    __tablename__ = "metas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String)
    valor_alvo = Column(Float)
    data_limite = Column(Date)
    icone = Column(String)