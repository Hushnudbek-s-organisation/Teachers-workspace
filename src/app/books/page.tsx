import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { BooksClient } from "@/components/books/BooksClient";
import { listBookMetas } from "@/lib/books/store";

export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const books = await listBookMetas();

  return (
    <>
      <PageHeader
        title="Kitoblar va o'yinlar"
        description="Darslikni yuklang — tizim mavzularga bo'lib, ichidagi misol va topshiriqlardan o'yin yasaydi"
        action={
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 sm:flex">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            3-sinf · 5 fan · {books.length} kitob
          </div>
        }
      />
      <BooksClient books={books} />
    </>
  );
}
