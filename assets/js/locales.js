(function(){
  window.EllisLocale={
    chinese:()=>document.documentElement.lang==='zh-Hans',
    t:value=>document.documentElement.lang==='zh-Hans'?(window.ELLIS_ZH_MESSAGES?.[value]||value):value,
  };
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-language-switch]').forEach(link=>{const target=new URL(link.href);target.search=location.search;target.hash=location.hash;link.href=target.href;});
    if(!window.EllisLocale.chinese())return;
    const synonyms={
      'handymen':['杂工','综合维修','小活','维修师傅'], 'carpenters':['木工','木材维修'],
      'door-repairs':['修门','门维修','门框','门铰链'], 'sliding-door-repairs':['推拉门','滑门','移门','滚轮'],
      'window-repairs':['修窗','窗户','木窗'], 'fly-screens':['纱窗','防蚊网','纱门'],
      'cabinet-wardrobe-repairs':['橱柜','柜门','抽屉','衣柜','铰链','滑轨'], 'plasterers':['墙洞','石膏板','墙面修补','天花板'],
      'electricians':['电工','插座','电路'], 'plumbers':['水管','水龙头','马桶','漏水'],
      'clothesline-repairs-installation':['晾衣架','晾衣绳'], 'furniture-assembly':['家具组装','宜家','组装'],
      'gutter-services':['天沟','排水沟','落水管'], 'house-painters':['油漆','粉刷','补漆'],
      'garden-clean-up':['花园清理','庭院整理'], 'lawn-mowing':['割草','草坪'], 'tiling':['瓷砖','贴砖'],
      'waterproofing':['防水','渗漏'], 'shelving-mirror-picture-hanging':['挂画','镜子','搁板','置物架'],
    };
    for(const item of window.ELLIS_SEARCH_CATALOG||[]){const slug=item.route.split('/').filter(Boolean).at(-1);item.terms.push(window.EllisLocale.t(item.service),...(synonyms[slug]||[]));}
  });
})();
