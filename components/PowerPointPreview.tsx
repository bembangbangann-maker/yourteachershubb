import React, { useState, useRef, useMemo } from 'react';
import { SlideContent } from '../types';
import { DownloadIcon, ChevronsLeftIcon, ChevronsRightIcon } from './icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-hot-toast';
import ReactDOM from 'react-dom/client';

interface PowerPointPreviewProps {
  slides: SlideContent[];
  onThemeChange: (theme: string) => void;
  selectedTheme: string;
}

const themes = [
    { id: 'pptx-theme-default', name: 'Default', color: 'bg-gray-200' },
    { id: 'pptx-theme-notebook', name: 'Notebook', color: 'bg-yellow-100' },
    { id: 'pptx-theme-chalkboard', name: 'Chalkboard', color: 'bg-gray-800' },
    { id: 'pptx-theme-blueprint', name: 'Blueprint', color: 'bg-blue-800' },
    { id: 'pptx-theme-books', name: 'Books', color: 'bg-orange-200' },
];

const Slide: React.FC<{ slide: SlideContent }> = ({ slide }) => {
    const parseContent = (content: string | string[]) => {
        const contentArray = Array.isArray(content) ? content : content.split('\n');
        return (
            <ul className="list-disc list-inside space-y-2">
                {contentArray.map((line, index) => line.trim() && <li key={index}>{line}</li>)}
            </ul>
        );
    };

    const renderContent = () => {
        switch (slide.type) {
            case 'title':
                return (
                    <div className="text-center flex flex-col justify-center items-center h-full">
                        {slide.image && <img src={`data:image/png;base64,${slide.image}`} alt={slide.title} className="max-h-48 object-contain mb-4 rounded-lg" />}
                        <h1 className="text-5xl font-bold">{slide.title}</h1>
                        <p className="text-2xl mt-4">{slide.subtitle}</p>
                    </div>
                );
            case 'objectives':
                return (
                     <div>
                        <h2 className="text-3xl font-bold mb-6">{slide.title}</h2>
                        {parseContent(slide.content)}
                    </div>
                );
            case 'quiz':
                return (
                    <div>
                        <h2 className="text-3xl font-bold mb-6">{slide.title}</h2>
                        <p className="text-xl mb-4">{slide.quizQuestion?.questionText}</p>
                        {slide.quizQuestion?.options && (
                            <ul className="list-decimal list-inside space-y-2 text-lg">
                                {slide.quizQuestion.options.map((opt, i) => <li key={i}>{opt}</li>)}
                            </ul>
                        )}
                    </div>
                );
            case 'content':
            default:
                return (
                    <div>
                        <h2 className="text-3xl font-bold mb-6">{slide.title}</h2>
                        <div className="whitespace-pre-wrap text-lg">
                            {parseContent(slide.content)}
                        </div>
                    </div>
                );
        }
    };
    return <div className="p-8 h-full">{renderContent()}</div>;
};

const PowerPointPreview: React.FC<PowerPointPreviewProps> = ({ slides, onThemeChange, selectedTheme }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const handleDownloadPdf = async () => {
        setIsDownloading(true);
        const toastId = toast.loading('Preparing PDF...');

        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '1123px';
        tempContainer.style.height = '794px';
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        try {
            for (let i = 0; i < slides.length; i++) {
                toast.loading(`Processing slide ${i + 1} of ${slides.length}...`, { id: toastId });
                
                const slideComponent = (
                    <div className={`w-full h-full ${selectedTheme}`}>
                        <Slide slide={slides[i]} />
                    </div>
                );
                root.render(<React.StrictMode>{slideComponent}</React.StrictMode>);
                await new Promise(resolve => setTimeout(resolve, 300));
                
                const canvas = await html2canvas(tempContainer, { scale: 2, useCORS: true, backgroundColor: null });
                const imgData = canvas.toDataURL('image/jpeg', 0.9);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            }

            pdf.save(`${slides[0].title?.replace(/\s/g, '_') || 'presentation'}.pdf`);
            toast.success('PDF downloaded successfully!', { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate PDF.', { id: toastId });
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b border-base-300">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">Presentation Preview</h3>
                    <span className="text-sm text-base-content/70">({currentSlide + 1} / {slides.length})</span>
                </div>
                 <button onClick={handleDownloadPdf} disabled={isDownloading} className="flex items-center bg-secondary hover:bg-secondary-focus text-white font-bold py-2 px-4 rounded-lg">
                    <DownloadIcon className="w-5 h-5 mr-2"/>
                    {isDownloading ? 'Generating...' : 'Download as PDF'}
                </button>
            </div>
            
            <div className="flex-grow p-4 min-h-0">
                <div className={`w-full h-full aspect-video rounded-lg shadow-lg ${selectedTheme}`}>
                    {slides.length > 0 && <Slide slide={slides[currentSlide]} />}
                </div>
            </div>

            <div className="p-4 border-t border-base-300">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Theme:</span>
                        {themes.map(theme => (
                            <button 
                                key={theme.id}
                                title={theme.name}
                                onClick={() => onThemeChange(theme.id)}
                                className={`w-8 h-8 rounded-full border-2 ${selectedTheme === theme.id ? 'border-primary scale-110' : 'border-base-300'} ${theme.color} transition-transform`}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentSlide(p => Math.max(0, p - 1))} disabled={currentSlide === 0} className="p-2 bg-base-300 rounded-md disabled:opacity-50"><ChevronsLeftIcon className="w-5 h-5"/></button>
                        <button onClick={() => setCurrentSlide(p => Math.min(slides.length - 1, p + 1))} disabled={currentSlide === slides.length - 1} className="p-2 bg-base-300 rounded-md disabled:opacity-50"><ChevronsRightIcon className="w-5 h-5"/></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PowerPointPreview;
