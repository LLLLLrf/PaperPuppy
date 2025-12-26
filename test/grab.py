import requests
from bs4 import BeautifulSoup
import json
import sys

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

def main():
    """
    主函数，获取用户输入并输出JSON结果
    """
    # 获取用户输入
    if len(sys.argv) > 1:
        query = ' '.join(sys.argv[1:])
    else:
        query = input("请输入搜索关键词: ")
    
    if not query:
        print("搜索关键词不能为空")
        sys.exit(1)
    
    # 获取搜索结果
    print(f"正在从Google Scholar搜索: {query}...")
    results = search_google_scholar(query)
    
    if not results:
        print("未找到任何结果")
        sys.exit(1)
    
    # 输出JSON结果
    print("\n搜索结果 (JSON格式):")
    print(json.dumps(results, ensure_ascii=False, indent=2))
    
    # 保存到文件
    output_file = f"scholar_results_{query.replace(' ', '_')[:50]}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到文件: {output_file}")
    print(f"共找到 {len(results)} 篇文章")

if __name__ == "__main__":
    main()