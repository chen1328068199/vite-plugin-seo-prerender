import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import {recursiveMkdir} from './utils'

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const seoPrerender = async (config: any) => {
  const browser = await puppeteer.launch(Object.assign({headless: 'new'}, config.puppeteer || {}));
  const page = await browser.newPage()
  console.log('cookies', config.cookies)
  const logTip: string = '[vite-plugin-seo-climsi-prerender:routes]'
  let network = {}
  if (config.network) {
    network = {waitUntil: 'networkidle0'} // 等待所有请求结束
  }
  for (const item of config.routes) {
    //console.log('path', path.join(config.local, item))
    //console.log('path2', config.local, item)

    if(!config.noCookiesRoutes.includes(item)){
      await page.setCookie(...config.cookies);
    }else{
      const cookies = await page.cookies();
      // 清空所有 cookies
      if (cookies.length > 0) {
        await page.deleteCookie(...cookies);
        console.log('所有 cookies 已被清空');
      } else {
        console.log('没有找到 cookies');
      }
    }      

    let pageUrl: string = config.local + config.baseUrl + item
    if (config.hashHistory) {
      pageUrl = `${config.local + config.baseUrl}/#${item}`
    }
    //console.log('pageurl',pageUrl)
    await page.goto(pageUrl, network)
    await page.setViewport({width: 1024, height: 768})
    await page.waitForSelector('body')
    if(config.delay){
     await delay(config.delay)
    }
    let content: string = await page.content()
    if (config.removeStyle !== false) {
      // 若出现导常，可设置参数removeStyle:false
      content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    }
    // 防止当设置了base:./形式时，会使用http的形式加载样式脚本资源，这里转为根路径
    // 这里其实还存在问题，当直接访问xx/index.html 插入的公共资源也为./这样的形式，是加载不到的
    const regLocal = new RegExp(config.local, 'g')
    content = content.replace(regLocal, '')

    if (config.callback) {
      content = config.callback(content, item) || content
    }
    if (item.indexOf('?') !== -1) {
      // 填写的路由地址带有意外参数时不处理
      console.log(`${logTip} ${item} is error,unexpected?`)
    } else {
      const fullPath = path.join(config.outDir, item)
      recursiveMkdir(fullPath)
      const filePath = path.join(fullPath, 'index.html')
      fs.writeFileSync(filePath, content)
      //console.log(content)
      console.log(`${logTip} ${filePath.replace(/\\/g, '/')} is success!`)
    }
  }
  await browser.close();
  console.log(`${logTip} is complete`)
}
export default seoPrerender
