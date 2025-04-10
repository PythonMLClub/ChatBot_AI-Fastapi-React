import { IoIosArrowForward } from 'react-icons/io';

const Footer = () => {
    const footerLinks = [
        { text: '14 Million Business Leads', href:'https://www.goleads.com/Sales-leads-home.aspx' },
        { text: 'New Business',href:'https://www.goleads.com/sales-leads-products-signup.aspx' },
        { text: 'Qualified Leads',href:'https://www.goleads.com/' },
        { text: 'About Us',href:'https://www.usfarmdata.com/farm-why-us' },
        { text: 'Contact Us',href:'https://www.usfarmdata.com/farm-contact' },
        { text: '220 Million Consumers Leads',href:'https://www.goleads.com/Residential/Residential-leads-home.aspx' },
        { text: 'Telemarketing Lists',href:'https://www.goleads.com/Sales-leads-List-Services.aspx' },
        { text: 'Data enhancement',href:'https://www.goleads.com/Sales-Leads-Data-Services.aspx' },
        { text: 'Search Now',href:'https://www.usfarmdata.com/farm-search' },
        { text: 'Resources',href:'https://www.usfarmdata.com/us-farm-resources' },
        { text: 'Email Lists', href:'https://www.goleads.com/email-leads-home.aspx' },
        { text: 'NCOA',href:'https://www.goleads.com/Sales-Leads-Data-Services.aspx' },
        { text: 'Webinars',href:'https://www.usfarmdata.com/lead-generation-webinar-series' },
        { text: 'Sitemap' , href:'https://www.usfarmdata.com/sitemap'},
        { text: 'Newsletter',href:'https://www.usfarmdata.com/farm-newsletter' },
    ];
    return (
        <footer className="bg-[url('https://www.usfarmdata.com/Images_New/body-tail.gif')] text-white py-8 mt-5">
            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4 text-white space-y-4 text-sm">
                {footerLinks?.map((link, index) => (
                    <div key={index} className="text-white flex space-x-1 cursor-pointer">
                        <IoIosArrowForward className='mt-1' />
                        <h3><a href={link?.href} target="_blank">{link?.text}</a></h3>
                    </div>
                ))}
            </div>
        </footer>
    );
};

export default Footer;
