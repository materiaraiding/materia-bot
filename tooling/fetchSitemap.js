/**
 * Utility to fetch sitemap XML data from materiaraiding.com
 */

/**
 * Fetches the sitemap XML data from materiaraiding.com
 * @returns {Promise<string|null>} The XML data as text or null if there's an error
 */
async function fetchSitemapXML() {
    try {
        const response = await fetch('https://materiaraiding.com/sitemap.xml');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const xmlData = await response.text();
        return xmlData;
    } catch (error) {
        console.error({
            message: 'Error fetching sitemap XML',
            error: error.message,
            stack: error.stack,
            url: 'https://materiaraiding.com/sitemap.xml',
            timestamp: new Date().toISOString()
        });
        return null;
    }
}

module.exports = {
    fetchSitemapXML
};
