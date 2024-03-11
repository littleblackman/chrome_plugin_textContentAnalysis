document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: analysePage
        }, function(results) {
            if (!results || !results.length) return;
            const info = results[0].result;
            document.getElementById('pageTitle').textContent = info.pageTitle;
            document.getElementById('pageDescription').textContent = info.metaDescription;
            const headings = document.getElementById('headings');
            info.headings.forEach(heading => {
                const elem = document.createElement('div');
                elem.textContent = `${heading.level}: ${heading.text}`;
                headings.appendChild(elem);
            });
            const linksContainer = document.getElementById('links');
            info.links.forEach(link => {
                const linkElem = document.createElement('div');
                linkElem.innerHTML = `Lien sur ${link.text} - Href: ${link.href}`;
                linksContainer.appendChild(linkElem);
            });

            const wordWeightContainer = document.getElementById('resultWordWeight');
            info.resultWordWeight.slice(0, 50).forEach(([word, count]) => {
                const wordElem = document.createElement('div');
                wordElem.textContent = `${word}: ${count}`;
                wordWeightContainer.appendChild(wordElem);
            });
        });
    });
});

function analysePage() {
    const pageTitle = document.querySelector('title')?.innerText || '';
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
        level: h.tagName,
        text: h.innerText
    }));

    const links = Array.from(document.querySelectorAll('a'))
        .filter(a => a.href.trim() !== '')
        .map(a => ({
            href: a.href,
            text: a.innerText.trim()
        }));

    const bodyClone = document.body.cloneNode(true);

    // Function to remove elements from the clone
    const removeElements = (selector) => {
        const elements = bodyClone.querySelectorAll(selector);
        elements.forEach(el => el.parentNode.removeChild(el));
    };

    // remove
    removeElements('h1, h2, h3, h4, h5, h6, header, nav, select, footer, a, img, script, style, link, .phpdebugbar, .phpdebugbar-openhandler, .phpdebugbar-openhandler-overlay');

    // Extraction fullTextContent
    let fullTextContent = bodyClone.innerText.trim();
    fullTextContent = fullTextContent.replace(/\s+/g, ' ').trim();

    // count words
    function calculWeightWord(texte) {
        texte = texte.toLowerCase();
        texte = texte.replace(/[^a-z0-9À-ÿ]+/gi, ' ');
        const words = texte.split(/\s+/);
        const wordsFiltered = words.filter(mot => mot.length >= 3);
        const wordCounted = wordsFiltered.reduce((acc, mot) => {
            acc[mot] = acc[mot] ? acc[mot] + 1 : 1;
            return acc;
        }, {});

        const wordCountedFiltered = Object.entries(wordCounted).filter(([mot, count]) => count > 1);

        // Sorted by count
        const sortedWordCounted = wordCountedFiltered.sort((a, b) => b[1] - a[1]);

        return sortedWordCounted;
    }

    // add headings text
    const headingsText = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => h.innerText.trim())
        .join(' ');

    //link text
    const linksText = Array.from(document.querySelectorAll('a'))
        .filter(a => a.href.trim() !== '')
        .map(a => a.innerText.trim())
        .join(' ');

    const combinedText = `${headingsText} ${linksText} ${fullTextContent}`;

    const resultWordWeight = calculWeightWord(combinedText);

    return { pageTitle, metaDescription, headings, links, resultWordWeight };
}
