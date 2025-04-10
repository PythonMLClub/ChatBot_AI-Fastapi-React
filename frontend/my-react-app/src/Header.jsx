import { HiMiniArrowRightEndOnRectangle } from "react-icons/hi2";

const Header = () => {

    return (
        <>
            <div className="flex w-full justify-between">
                <div>
                    <a href="https://www.usfarmdata.com" target="_blank" title="2.5 Million Farmers &amp; Ranchers Leads To Grow your business. Grow Your Sales With This Powerful Farmers &amp; Ranchers Leads">
                        <img className="img-responsive ml-2" src="./logo.png" alt="USFarm Data" />
                    </a>
                </div>

                <div className="mt-3">
                    <div className="flex items-center gap-3">
                        <h3 className="text-2xl text-white font-bold m-auto">402-337-4050</h3>
                        <button className="bg-transparent border border-yellow-500 font-bold text-white px-3 h-8 rounded-md transition-all">
                            <a href="https://www.usfarmdata.com/" target="_blank">
                                <div className="flex space-x-1">
                                    <HiMiniArrowRightEndOnRectangle className="font-bold text-lg" />
                                    <p>LOGIN</p>

                                </div>
                            </a>
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-center mt-4 flex items-center">
                            <a href="https://www.facebook.com/usfarmdata" target="_blank" title="USFarmData" className="inline-block mx-2 cursor-pointer">
                                <img src="https://www.usfarmdata.com/Images_New/USFD-Facebook.png" alt="FB" />
                            </a>
                            <a href="https://www.twitter.com/USFarmdata cursor-pointer" target="_blank" title="USFarmData" className="inline-block mx-2 cursor-pointer">
                                <img src="https://www.usfarmdata.com/Images_New/USFD-Twitter.png" alt="Twitter" />
                            </a>
                            <a className="inline-block mx-2" href="https://blog.usfarmdata.com/?_ga=2.92095004.742342858.1742451415-300984292.1742451415" target="_blank">
                                <button className="bg-yellow-500 text-white border-8 border-white px-6 py-2 rounded-full font-bold text-xl cursor-pointer">
                                    BLOG
                                </button>
                            </a>
                        </div>
                    </div>

                </div>
            </div>
            <div class="border-1 border-black p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mt-4">
                <div class="border-r border-black text-center text-white cursor-pointer">
                    <h3><a href="https://www.usfarmdata.com/home" target="_blank" style={{fontFamily:'times', fontSize:18}}>HOME</a></h3>
                </div>
                <div class="border-r border-black text-center text-white cursor-pointer">
                    <h3><a href="https://www.usfarmdata.com/farm-why-us" target="_blank" style={{fontFamily:'times', fontSize:18}}>ABOUT US</a></h3>
                </div>
                <div class="border-r border-black text-center text-white cursor-pointer">
                    <h3><a href="https://www.usfarmdata.com/farm-search" target="_blank" style={{fontFamily:'times', fontSize:18}}>SEARCH NOW</a></h3>
                </div>
                <div class="border-r border-black text-center text-white cursor-pointer">
                    <h3><a href="https://www.usfarmdata.com/farm-contact" target="_blank" style={{fontFamily:'times', fontSize:18}}>CONTACT US</a></h3>
                </div>
                <div class="border-r border-black text-center text-white cursor-pointer">
                    <h3><a href="https://www.usfarmdata.com/farm-database-licensing-modeling-analytics" target="_blank" style={{fontFamily:'times', fontSize:18}}>LICENSING</a></h3>
                </div>
                <div class="text-center text-white cursor-pointer">
                    <h3><a href="https://www.usfarmdata.com/ag-marketing-library" target="_blank" style={{fontFamily:'times', fontSize:18}}>LIBRARY</a></h3>
                </div>
            </div>

        </>
    );
}

export default Header;
