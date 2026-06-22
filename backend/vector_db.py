import json

from langchain_chroma import Chroma
from langchain_core.documents import Document

try:
    from .rag_components import get_embeddings
    from .rag_config import CHROMA_DIR, CHUNKS_FILE, COLLECTION_NAME
except ImportError:
    from rag_components import get_embeddings
    from rag_config import CHROMA_DIR, CHUNKS_FILE, COLLECTION_NAME


def load_documents():
    if not CHUNKS_FILE.exists():
        raise FileNotFoundError(
            f"Chunks file not found: {CHUNKS_FILE}. "
            "Run `python backend\\chunks_documents.py` first."
        )

    chunks = json.loads(CHUNKS_FILE.read_text(encoding="utf-8"))
    documents = []

    for chunk in chunks:
        metadata = {
            "id": chunk.get("id", ""),
            "source": chunk.get("source", "unknown"),
            "title": chunk.get("title") or chunk.get("source", "unknown"),
            "source_url": chunk.get("source_url", ""),
            "source_type": chunk.get("source_type", "local"),
            "topic": chunk.get("topic", "unknown"),
            "start_word": chunk.get("start_word", ""),
            "end_word": chunk.get("end_word", ""),
        }
        documents.append(Document(page_content=chunk["text"], metadata=metadata))

    print(f"Loaded {len(documents)} chunks from {CHUNKS_FILE}")
    return documents


def split_documents(documents):
    print(f"Using pre-chunked documents: {len(documents)} chunks")
    return documents


def create_vector_store(chunks):
    if not chunks:
        raise ValueError("No chunks provided to create the vector store.")

    embeddings = get_embeddings()
    ids = [doc.metadata.get("id") or f"chunk_{index}" for index, doc in enumerate(chunks)]

    if CHROMA_DIR.exists():
        client_store = Chroma(
            collection_name=COLLECTION_NAME,
            persist_directory=str(CHROMA_DIR),
            embedding_function=embeddings,
        )
        try:
            client_store.delete_collection()
        except Exception:
            pass

    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        ids=ids,
        collection_name=COLLECTION_NAME,
        persist_directory=str(CHROMA_DIR),
    )
    print(
        f"Created vector store with {vector_store._collection.count()} "
        f"embeddings in {CHROMA_DIR}"
    )
    return vector_store


def main():
    documents = load_documents()
    chunks = split_documents(documents)
    create_vector_store(chunks)


if __name__ == "__main__":
    main()
