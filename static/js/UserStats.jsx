import React, { useState, useEffect, useContext, useRef} from 'react';
const $          = require('./sefaria/sefariaJquery');
const d3 = require('./lib/d3.v5.min');
const Sefaria    = require('./sefaria/sefaria');
const PropTypes  = require('prop-types');
const {SheetBlock}      = require('./Story');
const {
    SimpleLinkedBlock,
    TextBlockLink,
    ThreeBox
    }    = require('./Misc');
const { useDebounce } = require('./Hooks');


const UserStats = () => {

    const [uid, setUid] = useState(1);
    const [user_data, setUserData] = useState({});
    const [site_data, setSiteData] = useState({});

    const debouncedUID = useDebounce(uid, 500);

    useEffect(() => {
        $.getJSON("/api/site_stats")
            .then(d => setSiteData(d));
    }, []);

    useEffect(() => {
        setUserData({});
        $.getJSON("/api/user_stats/" + debouncedUID)
            .then(d => setUserData(d));
    }, [debouncedUID]);

    const all_ready = user_data.uid && site_data.categoriesRead;

    return (
    <div className="homeFeedWrapper">
      <div className="content hasFooter" style={{padding: "0 40px 80px"}}>
        <h1 style={{textAlign: "center"}}>
          <span className="int-en">User Stats</span>
          <span className="int-he">סטטיסטיקות משתמש</span>
        </h1>
        <UserChooser setter={setUid}/>
        {all_ready?<UserProfileBlock user_data={user_data}/>:"Loading"}
        {all_ready && <UserDataBlock user_data={user_data} site_data={site_data}/>}
      </div>
    </div>
    );
};

const UserChooser = ({setter}) => (
    <div style={{textAlign: "center"}}>
      <label>User ID:
        <input type="text" onChange={e => setter(parseInt(e.target.value))}/>
      </label>
    </div>
);

const UserProfileBlock = ({user_data}) => (
        <div style={{display: "flex", justifyContent:"center"}}>
            <div style={{padding: "0 10px"}}>
                <img src={user_data.imageUrl} width="80" height="80"/>
            </div>
            <div style={{padding: "0 10px"}}>
                <h3><a href={user_data.profileUrl}>{user_data.name}</a></h3>
                <div>{user_data.position?(user_data.position + " at " + user_data.organization):user_data.organization}</div>
            </div>
        </div>
);

const StatCard = ({icon_file, name, number}) => (
    <div style={{height: "220px", width: "220px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", borderRadius: "10px", display: "flex", flexDirection: "column", justifyContent:"center"}}>
        <img style={{opacity: .4, height: "70px", width: "70px", margin: "0 auto 20px"}} src={"static/img/" + icon_file}/>
        <div style={{fontSize: "28px", textAlign: "center"}}>{number}</div>
        <div style={{fontSize: "24px", textAlign: "center", color: "#aaa"}}>{name}</div>
    </div>
);

    const UserDataBlock = ({user_data, site_data}) => (
    <div>
        <div>
            <h3>Your Overall Activity</h3>
            <div style={{display: "flex", justifyContent:"space-around"}}>
                <StatCard icon_file="book-icon.svg" number={user_data.textsRead} name="Texts Read"/>
                <StatCard icon_file="file-icon.svg" number={user_data.sheetsRead} name="Sheets Read"/>
                <StatCard icon_file="plus.svg" number={user_data.totalSheets} name="Sheets Created"/>
            </div>
        </div>
        <div>
            <h3>Your Favorite Texts</h3>
            <ThreeBox content={user_data.mostViewedRefs.map((r,i) =>
                <TextBlockLink key={i} sref={r.en} title={r.en} heTitle={r.he} book={r.book}/>)}/>
        </div>
        <div>
            <h3>Your Favorite Sheets</h3>
            {user_data.mostViewedSheets.map((sheet,i) => <SheetBlock sheet={sheet} key={i}/>)}
        </div>
        <div>
            <h3>Your Most Popular Sheets</h3>
            {user_data.popularSheets.map((sheet, i) => <div key={i}>
                    <SimpleLinkedBlock en={sheet.title} he={sheet.title} url={"/sheets/" + sheet.id}/>
                    <div>{sheet.views} Views</div>
                </div>
            )}
        </div>
        <div>
            <h3>Your Reading by Category</h3>
            <div style={{display: "flex", justifyContent:"space-around"}}>
                <CategoriesDonut title="User" cats={user_data.categoriesRead}/>
                <CategoriesDonut title="Site" cats={site_data.categoriesRead}/>
            </div>
        </div>
        <div>
            <h3>Your Top Categories</h3>
            <div style={{display: "flex", justifyContent:"space-around"}}>
                <CategoryBars user_cats={user_data.categoriesRead} site_cats={site_data.categoriesRead}/>
            </div>
        </div>
    </div>
);

const mapToPercentage = data => {
    const newData = {};
    const total = Object.entries(data).map(k => k[1]).reduce((a, b) => a + b, 0);
    Object.keys(data).forEach(k => newData[k] = data[k]/total);
    return newData;
};

const makeOtherCategory = data => {
    const total = data.map(e => e.value).reduce((a, b) => a + b, 0);
    const bar = total * .04;
    const remainder = data.filter(e => e.value < bar).map(e => e.value).reduce((a, b) => a + b, 0);
    const result = data.filter(e => e.value >= bar);
    result.push({name: "Etc", value: remainder});
    return result;
};

const CategoryBars = ({user_cats, site_cats}) => {
    const svg_ref = useRef();

    const height = 500;
    const width = 1000;
    const margin = {top: 10, right: 10, bottom: 20, left: 40};

    const keys = ["user", "site"];


    useEffect(()=> {
        const svg = d3.select(svg_ref.current);
        if (!svg) {return;}

        const user_percents = mapToPercentage(user_cats);
        const site_percents = mapToPercentage(site_cats);
        const orderedCats = Object.entries(user_cats).sort((a, b) => b[1] - a[1]).map(d => d[0]);
        const data = orderedCats.slice(0,5).map(cat => ({cat: cat, site: site_percents[cat], user: user_percents[cat]}));

        const y = d3.scaleBand()
            .domain(data.map(d => d.cat))
            .rangeRound([margin.top + 10, height - margin.bottom])
            .paddingInner(0.1);

        const inter_bar_padding = 0.05;
        const below_text_padding = 10;
        const userbar = 5;
        const sitebar = 34;

        const x = d3.scaleLinear()
            .domain([0, d3.max(data.map(d => [d.site, d.user]).flat()) + .10]).nice()
            .rangeRound([0,width - margin.right]);

        const groups = svg.append("g")
            .selectAll("g")
            .data(data)
            .join("g")
            .attr("transform", d => `translate(${margin.left}, ${y(d.cat)})`);

        groups.append("text")
            .attr("font-family", '"Frank Ruehl Libre",  "adobe-garamond-pro", "Crimson Text", Georgia, serif')
            .attr("text-anchor", "start")
            .attr("letter-spacing", 1.5)
            .attr("font-size", 22)
            .text(d => d.cat.toUpperCase());

        groups.selectAll("rect")
            .data(d => keys.map(key => ({key, cat:d.cat, value: d[key]})))
            .join("rect")
            .attr("class", d => d.key)
            .attr("x", 0)
            .attr("y", d => d.key === "user" ? below_text_padding : below_text_padding + userbar + inter_bar_padding)
            .attr("width", d => x(d.value))
            .attr("height", d => d.key === "user" ? userbar : sitebar)
            .attr("fill", d => d.key === "user" ? Sefaria.palette.categoryColor(d.cat) : "#ededec");

        d3.select("svg g g:first-child")
            .append("text")
            .attr("y", below_text_padding + userbar + inter_bar_padding + sitebar - 11)
            .attr("x", d => x(d.site) > 250 ? x(d.site) - 20 : x(d.site) + 20)
            .attr("font-size", 16)
            .attr("fill", "#999")
            .attr("text-anchor", d => x(d.site) > 250 ? "end" : "start")
            .text("Average Sefaria User");

        return () => {svg.selectAll("*").remove();}
    }, [user_cats, site_cats]);

    return (
        <div style={{font: "12px sans-serif"}}>
            <h3>Your Top Categories</h3>
            <svg ref={svg_ref} width={width} height={height} textAnchor="middle" />
        </div>
    );
};

const CategoriesDonut = ({cats, title}) => {
    const svg_ref = useRef();

    const width = 420;
    const height = 420;
    const raw_data = Object.entries(cats).map(e => ({name: e[0], value: e[1]}));
    const data = (raw_data.length > 2)?makeOtherCategory(raw_data):raw_data;
    const total = data.map(e => e.value).reduce((a, b) => a + b, 0);
    const compare = (a,b) => (
        a.name==="Etc"? 1
        :b.name==="Etc"? -1
        :b.value - a.value);
    const pie = d3.pie()
        .sort(compare)
        .value(d => d.value);
    const arcs = pie(data);
    const radius = Math.min(width, height) / 2 * 0.75;
    const arcLabel = d3.arc().innerRadius(radius).outerRadius(radius);
    const arc = d3.arc()
        .innerRadius(Math.min(width, height) / 2 - 10)
        .outerRadius(Math.min(width, height) / 2 - 1);

    useEffect(()=>{
        const svg = d3.select(svg_ref.current);
        if (!svg) {return;}

        const g = svg.append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);
        g.selectAll("path")
          .data(arcs)
          .enter().append("path")
            .attr("fill", d => Sefaria.palette.categoryColor(d.data.name))
            .attr("stroke", "white")
            .attr("d", arc)
          .append("title")
            .text(d => `${d.data.name}: ${d.data.value.toLocaleString(undefined,{style: 'percent', minimumFractionDigits:2})}`);

        const text = g.selectAll("text")
          .data(arcs)
          .enter().append("text")
            .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
            .attr("dy", "0.35em");

      text.append("tspan")
          .attr("x", 0)
          .attr("y", "-0.7em")
          .text(d => d.data.name);

      text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
          .attr("x", 0)
          .attr("y", "0.7em")
          .attr("fill", "#999")
          .text(d => (d.data.value/total).toLocaleString(undefined,{style: 'percent'}) );

        return () => {svg.selectAll("*").remove();}
    }, [cats]);


    return (
        <div style={{font: "14px sans-serif", padding: "0 10px"}}>
            <h3>{title}</h3>
            <svg ref={svg_ref} width={width} height={height} textAnchor="middle" />
        </div>
    );
};


module.exports = UserStats;
