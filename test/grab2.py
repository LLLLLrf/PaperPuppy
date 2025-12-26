import os
import re
import time
import requests
import pdfplumber
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://scholar.google.com/',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
}


def search_google_scholar(query, num_results=10):
    """
    从Google Scholar搜索文章并返回结果
    
    参数:
        query (str): 搜索关键词
        num_results (int): 返回结果数量
    
    返回:
        list: 文章信息列表
    """
    try:
        # 构建搜索URL
        url = f"https://scholar.google.com/scholar?hl=en&as_sdt=0%2C5&q={requests.utils.quote(query)}&num={num_results}"
        
        # 发送请求
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # 检查请求是否成功
        
        # 解析HTML
        soup = BeautifulSoup(response.text, 'lxml')
        
        # 提取搜索结果
        results = []
        articles = soup.select('.gs_r.gs_or.gs_scl')  # 文章容器
        
        for article in articles:
            # 提取标题和链接
            title_element = article.select_one('.gs_rt')
            if title_element:
                title = title_element.text
                link = title_element.find('a')['href'] if title_element.find('a') else ''
            else:
                title = ''
                link = ''
            
            # 提取作者信息
            author_element = article.select_one('.gs_a')
            authors = ''
            year = ''
            publication = ''
            
            if author_element:
                author_text = author_element.text
                # 尝试解析作者、年份和出版物信息
                parts = author_text.split('-')
                if len(parts) >= 2:
                    authors = parts[0].strip()
                    # 从第二部分提取年份和出版物
                    pub_info = parts[1].strip()
                    # 查找年份
                    for part in pub_info.split():
                        if part.isdigit() and len(part) == 4:
                            year = part
                            break
                    publication = pub_info
            
            # 提取摘要
            abstract_element = article.select_one('.gs_rs')
            abstract = abstract_element.text.strip() if abstract_element else ''
            
            # 提取引用信息
            citation_element = article.select_one('.gs_fl a[href*="cites="]')
            citations = 0
            if citation_element:
                citation_text = citation_element.text
                # 提取引用数量
                for part in citation_text.split():
                    if part.isdigit():
                        citations = int(part)
                        break
            
            # 提取相关文章链接
            related_element = article.select_one('.gs_fl a[href*="related:"]')
            related_url = f"https://scholar.google.com{related_element['href']}" if related_element else ''
            
            # 提取PDF链接
            pdf_element = article.select_one('.gs_ggs a')
            pdf_url = pdf_element['href'] if pdf_element else ''
            
            # 添加到结果列表
            results.append({
                'title': title,
                'link': link,
                'authors': authors,
                'year': year,
                'publication': publication,
                'abstract': abstract,
                'citations': citations,
                'related_url': related_url,
                'pdf_url': pdf_url
            })
        
        return results
        
    except requests.exceptions.RequestException as e:
        print(f"请求错误: {e}")
        return []
    except Exception as e:
        print(f"解析错误: {e}")
        return []

def fetch_abstract_from_html(url, headers=headers, timeout=10):
    """尝试从文章 HTML 页面提取 abstract（从 meta 标签或常见节点）"""
    try:
        resp = requests.get(url, headers=headers, timeout=timeout)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'lxml')

        # 常见 meta 标签
        meta_names = [
            ('meta', {'name': 'citation_abstract'}),
            ('meta', {'name': 'dc.Description'}),
            ('meta', {'name': 'description'}),
            ('meta', {'property': 'og:description'}),
            ('meta', {'name': 'twitter:description'}),
        ]
        for tag_name, attrs in meta_names:
            tag = soup.find(tag_name, attrs=attrs)
            if tag and tag.get('content'):
                return tag['content'].strip()

        # 查找常用 class/id
        selectors = [
            'div.abstract', 'section.abstract', '.article__abstract', '#abstract',
            '.abstractInFull', '.Abstract', '.abstractSection'
        ]
        for sel in selectors:
            el = soup.select_one(sel)
            if el and el.text.strip():
                return el.text.strip()

        # 有些期刊把摘要放在 <p class="abstract-text"> 等
        p = soup.find('p')
        if p and p.text.strip() and len(p.text.strip()) > 80:
            # 仅在页面看起来像摘要时返回
            return p.text.strip()

    except Exception as e:
        # 忽略并返回 None
        pass
    return None

def download_pdf(url, save_dir='pdfs', timeout=15):
    """下载 PDF 到本地，返回本地文件路径或 None"""
    os.makedirs(save_dir, exist_ok=True)
    try:
        resp = requests.get(url, headers=headers, timeout=timeout, stream=True)
        resp.raise_for_status()
        # 简单检查 content-type
        ctype = resp.headers.get('Content-Type','')
        if 'pdf' not in ctype and not url.lower().endswith('.pdf'):
            # 不是 PDF
            return None
        fn = os.path.basename(urlparse(url).path) or 'article.pdf'
        local_path = os.path.join(save_dir, fn)
        with open(local_path, 'wb') as f:
            for chunk in resp.iter_content(1024*64):
                if chunk:
                    f.write(chunk)
        return local_path
    except Exception as e:
        return None

def extract_text_from_pdf(path):
    """用 pdfplumber 提取 PDF 文本（逐页拼接）"""
    try:
        texts = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    texts.append(t)
        return '\n'.join(texts)
    except Exception as e:
        return ''

# 用正则/启发式提取 Methods 段
METHOD_HEADINGS = [
    r'\bmaterials and methods\b',
    r'\bmaterials & methods\b',
    r'\bmethods\b',
    r'\bmethodology\b',
    r'\bexperimental\b',
    r'\bexperimental procedures\b',
    r'\bparticipants\b',   # 对于人类/行为学论文
    r'\bsubjects and methods\b',
    r'\bstudy design\b',
]

def find_section_by_headings(text, headings=METHOD_HEADINGS, chars_after=3000):
    """
    在长文本中查找第一个匹配 headings 的位置，返回一段文本（从 heading 开始往后 chars_after 字符）
    更高级的做法：找到下一节标题并截取之间内容；这里简单实现以兼容多数论文。
    """
    low = text.lower()
    match_pos = None
    matched_heading = None
    for pattern in headings:
        m = re.search(pattern, low)
        if m:
            pos = m.start()
            if match_pos is None or pos < match_pos:
                match_pos = pos
                matched_heading = m.group(0)
    if match_pos is None:
        return None, None
    start = match_pos
    # 尝试找到下一个大写标题或数字章节（简单 heuristic）
    following = low[start:start + chars_after]
    # 找到下一个显著的标题（例如 "results", "conclusion", "discussion", 或数字章节）
    end_candidates = []
    for end_word in ['\nresults', '\ndiscussion', '\nconclusion', '\nacknowledg', '\nreferences', '\nconclusions']:
        idx = following.find(end_word)
        if idx != -1:
            end_candidates.append(idx)
    # 也检查数字化章节像 "\n\d+." 的模式
    m2 = re.search(r'\n\d+[\.\)]\s', following)
    if m2:
        end_candidates.append(m2.start())
    if end_candidates:
        end = min(end_candidates)
        return text[start:start + end].strip(), matched_heading
    # 否则返回限定长度的片段
    return text[start:start + chars_after].strip(), matched_heading

# 整合逻辑：先尝试 pdf_url -> HTML -> 失败则留空
def enrich_result_with_abstract_and_methods(item, timeout=10):
    """
    item: dict with keys 'pdf_url', 'link', already from your results
    返回 (abstract, methods_text)
    """
    abstract = item.get('abstract') or None
    methods = None

    # 1) 如果已有 PDF 链接，尝试下载并解析
    pdf_url = item.get('pdf_url')
    if pdf_url:
        local_pdf = download_pdf(pdf_url, save_dir='pdfs')
        if local_pdf:
            text = extract_text_from_pdf(local_pdf)
            if text:
                # 如果尚无 abstract，尝试从 pdf 文本开头取摘要（很多论文在开头就有 abstract）
                if not abstract:
                    # 抽取开头 2000 字作为候选摘要，查找 "abstract"
                    head = text[:4000].lower()
                    m = re.search(r'\babstract\b', head)
                    if m:
                        # 从 "abstract" 后面取一段
                        a_start = m.end()
                        abstract_candidate = text[a_start:a_start+1000].strip()
                        # 截到下一节
                        a_end_match = re.search(r'\n\s*[A-Z][a-z]{2,}\s*\n', abstract_candidate)
                        if a_end_match:
                            abstract_candidate = abstract_candidate[:a_end_match.start()]
                        abstract = abstract_candidate.strip()

                # 提取 methods
                methods_text, heading = find_section_by_headings(text)
                if methods_text:
                    methods = methods_text

    # 2) 如果没有 pdf 或 pdf 无法解析，尝试访问文章页面
    if not abstract or not methods:
        link = item.get('link')
        if link:
            page_abs = fetch_abstract_from_html(link)
            if page_abs and not abstract:
                abstract = page_abs

            # 有时文章页面会包含 Methods（不常见），可以用简单全文搜索
            try:
                resp = requests.get(link, headers=headers, timeout=timeout)
                resp.raise_for_status()
                page_text = BeautifulSoup(resp.text, 'lxml').get_text(separator='\n')
                if not methods:
                    methods_text, heading = find_section_by_headings(page_text)
                    if methods_text:
                        methods = methods_text
            except Exception:
                pass

    # 3) 若都失败，可尝试从 item 的已有 abstract 字段或保持 None
    return abstract, methods

# 示例如何在主流程中使用（对你的 results 列表进行 enrich）
if __name__ == "__main__":
    # 假设 results 已经来自 search_google_scholar(query)
    query = "example query"
    results = search_google_scholar(query, num_results=5)
    from tqdm import tqdm
    for item in tqdm(results):
        a, m = enrich_result_with_abstract_and_methods(item)
        item['enriched_abstract'] = a
        item['methods_section'] = m
        time.sleep(1)  # 礼貌延迟，避免被封
    # 然后保存 results 到文件
    import json
    with open('enriched_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("done")