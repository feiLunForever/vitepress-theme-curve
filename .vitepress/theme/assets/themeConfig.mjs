// 主题配置
export const themeConfig = {
  // 站点信息
  siteMeta: {
    // 站点标题
    title: " Mr.E",
    // 站点描述
    description: "E仔的家",
    // 站点logo
    logo: "/images/logo/logo.webp",
    // 站点地址
    // site: "https://blog.imsyy.top",
    site: "https://www.mengdingbuhui.top",
    // 语言
    lang: "zh-CN",
    // 作者
    author: {
      name: "JBL",
      cover: "/images/logo/logo.webp",
      email: "mengdingbuhui@163.com",
      // link: "https://www.imsyy.top",
      link: "https://www.mengdingbuhui.top",
    },
  },
  // 备案信息
  icp: "copyright: MIT License",
  // 建站日期
  since: "2025-01-03",
  // 每页文章数据
  postSize: 8,
  // inject
  inject: {
    // 头部
    // https://vitepress.dev/zh/reference/site-config#head
    header: [
      // favicon图标配置，设置网站的图标链接，指向根目录下的favicon.ico文件
      ["link", { rel: "icon", href: "/favicon.ico" }],
      // RSS订阅配置，设置RSS订阅相关的链接及属性，用于用户订阅网站内容，这里链接指向 https://www.mengdingbuhui.top/rss.xml
      // [
      //   "link",
      //   {
      //     rel: "alternate",
      //     type: "application/rss+xml",
      //     title: "RSS",
      //     href: "https://www.mengdingbuhui.top/rss.xml",
      //   },
      // ],
      // // 预载 CDN
      // [
      //   "link",
      //   {
      //     crossorigin: "",
      //     rel: "preconnect",
      //     href: "https://s1.hdslb.com",
      //   },
      // ],
      [
        "link",
        {
          crossorigin: "",
          rel: "preconnect",
          href: "https://mirrors.sustech.edu.cn",
        },
      ],
      // HarmonyOS font
      [
        "link",
        {
          crossorigin: "anonymous",
          rel: "stylesheet",
          href: "https://s1.hdslb.com/bfs/static/jinkela/long/font/regular.css",
        },
      ],
      // 预载 南方科技大学 CDN
      [
        "link",
        {
          crossorigin: "anonymous",
          rel: "stylesheet",
          href: "https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/lxgw-wenkai-screen-webfont/1.7.0/style.css",
        },
      ],
      // iconfont
      [
        "link",
        {
          crossorigin: "anonymous",
          rel: "stylesheet",
          href: "https://cdn2.codesign.qq.com/icons/g5ZpEgx3z4VO6j2/latest/iconfont.css",
        },
      ],
      // Embed code
      ["link", { rel: "preconnect", href: "https://use.sevencdn.com" }],
      ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
      [
        "link",
        {
          crossorigin: "anonymous",
          href: "https://use.sevencdn.com/css2?family=Fira+Code:wght@300..700&display=swap",
          rel: "stylesheet",
        },
      ],
      // 预载 DocSearch 【预连接到Algolia的DocSearch服务，这通常用于站内搜索功能】
      [
        "link",
        {
          href: "https://X5EBEZB53I-dsn.algolia.net",
          rel: "preconnect",
          crossorigin: "",
        },
      ],
    ],
  },
  // 导航栏菜单
  nav: [
    {
      text: "文库",
      items: [
        { text: "文章列表", link: "/pages/archives", icon: "article" },
        { text: "全部分类", link: "/pages/categories", icon: "folder" },
        { text: "全部标签", link: "/pages/tags", icon: "hashtag" },
      ],
    },
    {
      text: "专栏",
      items: [
        { text: "技术分享", link: "/pages/categories/技术分享", icon: "technical" },
        { text: "我的项目", link: "/pages/project", icon: "code" },
        { text: "效率工具", link: "/pages/tools", icon: "tools" },
      ],
    },
  ],
  // 封面配置
  cover: {
    // 是否开启双栏布局
    twoColumns: true,
    // 是否开启封面显示
    showCover: {
      // 是否开启封面显示 文章不设置cover封面会显示异常，可以设置下方默认封面
      enable: true,
      // 封面布局方式: left | right | both
      coverLayout: 'both',
      // 默认封面(随机展示)
      defaultCover: [
        'https://example.com/1.avif',
        'https://example.com/2.avif',
        'https://example.com/3.avif'
      ]
    }
  },
  // 页脚信息
  footer: {
    // 社交链接（请确保为偶数个）
    social: [
      {
        icon: "email",
        link: "mengdingbuhui@163.com",
      },
      {
        icon: "github",
        link: "https://github.com/feiLunForever/vitepress-theme-curve",
      }
    ],
    // sitemap
    sitemap: [
      {
        text: "博客",
        items: [
          { text: "近期文章", link: "/" },
          { text: "全部分类", link: "/pages/categories" },
          { text: "全部标签", link: "/pages/tags" },
          { text: "文章归档", link: "/pages/archives" },
        ],
      },

      {
        text: "专栏",
        items: [
          { text: "技术分享", link: "/pages/categories/技术分享" },
          { text: "我的项目", link: "/pages/project" },
          { text: "效率工具", link: "/pages/tools" },
        ],
      }
    ],
  },
  // 侧边栏
  aside: {
    // 站点简介
    hello: {
      enable: true,
      text: "这里有关于<strong>开发</strong>相关的问题和看法，也会有一些<strong>奇技淫巧</strong>的分享，其中大部分内容会侧重于<strong>JAVA开发</strong>。希望你可以在这里找到对你有用的知识和教程。",
    },
    // 目录
    toc: {
      enable: true,
    },
    // 标签
    tags: {
      enable: true,
    },
    // 倒计时
    countDown: {
      enable: true,
      data:
        {
          name: "E仔",
          date: "2025-03-26",
          icon: "🧨",
          style: {
            layout: "card",
            showDays: true
          }
        }
    },
    // 站点数据
    siteData: {
      enable: true,
    },
  },
  // 搜索
  // https://www.algolia.com/
  search: {
    enable: true,
    appId: "HHKA40ZFYR",
    indexName: 'ez_pages',
    apiKey: "13d96613b21edc13efe6b666dc1f4ffb"
  },
  // 打赏
  rewardData: {
    enable: false,
    // 微信二维码
    wechat: "https://pic.efefee.cn/uploads/2024/04/07/66121049d1e80.webp",
    // 支付宝二维码
    alipay: "https://pic.efefee.cn/uploads/2024/04/07/661206631d3b5.webp",
  },
  // 图片灯箱
  fancybox: {
    enable: true,
    js: "https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/fancyapps-ui/5.0.36/fancybox/fancybox.umd.min.js",
    css: "https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/fancyapps-ui/5.0.36/fancybox/fancybox.min.css",
  },
  // 外链中转
  jumpRedirect: {
    enable: true,
    // 排除类名
    exclude: [
      "cf-friends-link",
      "upyun",
      "icp",
      "author",
      "rss",
      "cc",
      "power",
      "social-link",
      "link-text",
      "travellings",
      "post-link",
      "report",
      "more-link",
      "skills-item",
      "right-menu-link",
      "link-card",
    ],
  },
  // 站点统计
  tongji: {
    "51la": "3Kr33aSpNbkheSgz",
  },
  // 密码保护
  passwordProtect: {
    enable: true,
    // 设置不需要密码验证的页面路径
    excludePaths: [
      '/pages/about'
    ]
  }
};
