// File: ./server/services/EpubParser.ts

import AdmZip from 'adm-zip';
import * as cheerio from 'cheerio';

export interface EpubChapter {
    id: string;
    title: string;
    text: string;
}

export class EpubParser {
    static async parse(buffer: Buffer): Promise<EpubChapter[]> {
        const zip = new AdmZip(buffer);
        const zipEntries = zip.getEntries();
        const chapters: EpubChapter[] = [];

        // 1. Find container.xml to locate the OPF (package) file
        const containerEntry = zipEntries.find(e => e.entryName === 'META-INF/container.xml');
        if (!containerEntry) throw new Error('Invalid EPUB: Missing container.xml');

        const containerXml = containerEntry.getData().toString('utf8');
        const $container = cheerio.load(containerXml, { xmlMode: true });
        const opfPath = $container('rootfile').attr('full-path');

        if (!opfPath) throw new Error('Invalid EPUB: Could not find OPF path');

        // 2. Read OPF file to get manifest and spine
        const opfEntry = zipEntries.find(e => e.entryName === opfPath);
        if (!opfEntry) throw new Error('Invalid EPUB: Missing OPF file');

        const opfXml = opfEntry.getData().toString('utf8');
        const $opf = cheerio.load(opfXml, { xmlMode: true });
        const basePath = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

        const manifest: Record<string, string> = {};
        $opf('manifest item').each((_, el) => {
            const id = $opf(el).attr('id');
            const href = $opf(el).attr('href');
            if (id && href) manifest[id] = href;
        });

        // 3. Follow the spine to read files in the correct chronological order
        let chapterIndex = 1;
        $opf('spine itemref').each((_, el) => {
            const idref = $opf(el).attr('idref');
            if (!idref || !manifest[idref]) return;

            const filePath = basePath + manifest[idref];
            const htmlEntry = zipEntries.find(e => e.entryName === filePath);

            if (htmlEntry) {
                const htmlContent = htmlEntry.getData().toString('utf8');
                const $html = cheerio.load(htmlContent);

                // Strip styling and scripts
                $html('script, style, head, nav').remove();

                const rawText = $html('body').text();
                const cleanText = rawText
                    .replace(/\s+/g, ' ')
                    .replace(/\n+/g, '\n')
                    .trim();

                // Only keep chapters with actual content (skip blank pages/covers)
                if (cleanText.length > 50) {
                    chapters.push({
                        id: `ch-${chapterIndex}`,
                        title: $html('title').text() || `Chapter ${chapterIndex}`,
                        text: cleanText
                    });
                    chapterIndex++;
                }
            }
        });

        return chapters;
    }
}