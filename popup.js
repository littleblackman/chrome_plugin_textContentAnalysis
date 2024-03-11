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

            const headingsContainer = document.getElementById('headings');
            info.headings.forEach(heading => {
                const elem = document.createElement('div');
                elem.textContent = `${heading.level}: ${heading.text}`;
                headingsContainer.appendChild(elem);
            });

            const linksContainer = document.getElementById('links');
            info.links.forEach(link => {
                const linkElem = document.createElement('div');
                linkElem.innerHTML = `Lien sur ${link.text} - Href: ${link.href}`;
                linksContainer.appendChild(linkElem);
            });

            // Traitement pour afficher les 50 premiers mots, bigrams, trigrams
            displayResults('resultWordWeight', info.resultWordWeight.sortedWordCount, 'Top Single Words', 30);
            displayResults('resultWordWeight', info.resultWordWeight.sortedBigramCounts, 'Top Bigrams', 20);
            displayResults('resultWordWeight', info.resultWordWeight.sortedTrigramCounts, 'Top Trigrams', 20);
        });
    });
});

function displayResults(containerId, results, titleText, limit = 50) {
    const container = document.getElementById(containerId);
    const title = document.createElement('h3');
    title.textContent = titleText;
    container.appendChild(title);

    results.slice(0, limit).forEach(([phrase, count]) => {
        const elem = document.createElement('div');
        elem.textContent = `${phrase}: ${count}`;
        container.appendChild(elem);
    });
}
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
        texte = texte.replace(/[^a-z0-9À-ÿ\s]+/gi, ' ');
        const words = texte.split(/\s+/).filter(mot => mot.length >= 3);

        // Count unique words
        const wordCount = words.reduce((acc, mot) => {
            acc[mot] = (acc[mot] || 0) + 1;
            return acc;
        }, {});

        // Count bigrams
        const bigrams = words.slice(0, -1).map((current, i) => `${current} ${words[i + 1]}`);
        const bigramCounts = bigrams.reduce((acc, bigram) => {
            acc[bigram] = (acc[bigram] || 0) + 1;
            return acc;
        }, {});

        // Count trigrams
        const trigrams = words.slice(0, -2).map((current, i) => `${current} ${words[i + 1]} ${words[i + 2]}`);
        const trigramCounts = trigrams.reduce((acc, trigram) => {
            acc[trigram] = (acc[trigram] || 0) + 1;
            return acc;
        }, {});

        // Filter to keep only words that appear more than once
        const filteredWordCount = Object.entries(wordCount).filter(([word, count]) => count > 1);
        const filteredBigramCounts = Object.entries(bigramCounts).filter(([bigram, count]) => count > 1);
        const filteredTrigramCounts = Object.entries(trigramCounts).filter(([trigram, count]) => count > 1);

        // Order by count
        const sortedWordCount = filteredWordCount.sort((a, b) => b[1] - a[1]);
        const sortedBigramCounts = filteredBigramCounts.sort((a, b) => b[1] - a[1]);
        const sortedTrigramCounts = filteredTrigramCounts.sort((a, b) => b[1] - a[1]);

        return {
            sortedWordCount,
            sortedBigramCounts,
            sortedTrigramCounts
        };
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
