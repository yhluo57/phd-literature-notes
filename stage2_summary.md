# 第二阶段整理记录

本阶段聚焦文件名带重点标记的 9 篇 MnGa/MnAl 相关文献，把目录记录升级为精整理 v1。

## 已完成论文

### 009 Mn-Ga电极MTJ中磁阻效应的成分依赖与退火耐受性

- 原题: 2011-APL-Mg 插层-
- 作者: Takahide Kubota et al.
- 方向: MnGa MTJ
- 核心问题: 不同 Mn-Ga 成分如何影响 MnGa/MgO/CoFe MTJ 的 TMR、偏压依赖和退火稳定性？
- 核心贡献: 建立了 Mn-Ga 成分、退火温度和 TMR 表现之间的早期实验基准，指出 Mn62Ga38 是较优的 MnGa MTJ 电极成分。
- 与我课题关系: 适合作为 MnGa-MTJ 路线的基准论文：它给出成分、退火、TMR 的早期对照，也提醒后续实验要同时记录成分和退火窗口。
- 关键指标: max_tmr_10k=23% (Mn62Ga38, 退火 375 C); tmr_300k=约 7% (Mn62Ga38, 退火 350 C); annealing_endurance=TMR 退火耐受可到 375 C; pma=Ku 约 1-2 x 10^7 erg/cm3

### 010 具有应变 MnGa 纳米层的垂直磁隧道结

- 原题: 2016-Sci. Rep.-MnGa(3nm)-MgO-CoFeB
- 作者: K. Z. Suzuki et al.
- 方向: MnGa MTJ
- 核心问题: 能否把超薄 MnGa 做进 p-MTJ，同时保持高 PMA、低 Ms，并通过应变获得高自旋极化隧穿态？
- 核心贡献: 证明 CoGa 缓冲层可支撑 3 nm MnGa p-MTJ，并提出“应变调控 MnGa 能带以获得高 TMR 潜力”的机制图像。
- 与我课题关系: 与你的 MnGa/MnAl 薄膜和 MTJ 方向高度相关，尤其是 CoGa 缓冲层、超薄 L10-MnGa、应变、PMA 与界面终止之间的关系。
- 关键指标: tmr=3.1% at 300 K, 9.7% at 100 K, 12.8% at 5 K; pma_field=Hk 约 36 kOe; ms=约 350 +/- 50 emu/cm3; ku=约 6.3 +/- 0.9 x 10^6 erg/cm3 (有效), 7.1 +/- 1.1 x 10^6 erg/cm3 (intrinsic)

### 011 面向高磁场传感器的 L10-MnGa 磁隧道结

- 原题: 2017-JPD-L10-MnGa based magnetic tunnel junction for high magnetic field sensor
- 作者: X. P. Zhao et al.
- 方向: MnGa MTJ
- 核心问题: L10-MnGa 的高矫顽力和 PMA 能否用于构建宽动态范围、高线性度的 MTJ 磁场传感器？
- 核心贡献: 把 MnGa MTJ 从存储读出语境扩展到高磁场传感器，展示 Co 插层带来的 TMR 提升和宽动态范围。
- 与我课题关系: 如果你的 MnGa/MnAl 工作不仅服务 MRAM，也考虑磁传感或 AHE/TMR 器件，这篇可作为“应用转向”的参考。
- 关键指标: tmr_300k=27.4%; tmr_5k=74.6%; calibrated_tmr_300k=50.2% (deduced P-AP case); dynamic_range=+/- 5600 Oe; sensitivity=约 0.0011%/Oe

### 012 使用垂直磁各向异性 Mn 基四方合金电极实现超过 100% TMR 的 MTJ

- 原题: 2023-AIP Advances-Tunnel magnetoresistance exceeding 100% in magnetic tunnel junctions using Mn-based tetragonal alloy electrodes with perpendicular magnetic anisotropy-MnGa-Mg-CoMn-
- 作者: Kazuya Z. Suzuki and Shigemi Mizukami
- 方向: MnGa MTJ
- 核心问题: 如何突破 MnGa/MgO p-MTJ 长期低 TMR 的瓶颈，并让 Mn 基四方合金电极真正进入可用读出区间？
- 核心贡献: 通过 Mg + metastable bcc CoMn 插层工程，把 MnGa p-MTJ 的室温 TMR 推到 100% 以上。
- 与我课题关系: 这是 MnGa-MTJ 路线的关键阶段性论文。你的网页后续可以把它设为“核心节点”，连接 2011、2016 和 2025 的工作。
- 关键指标: max_tmr_300k=118%; max_tmr_10k=>260%; mg_interlayer=0.4-0.5 nm 最优; annealing_window=TMR 最大值出现在约 250-275 C

### 013 使用亚稳 bcc CoMnFe 插层增强全垂直 MnGa MTJ 的 TMR

- 原题: 2025-AIP Advances-Enhancement of tunnel magnetoresistance in fully perpendicular MnGa-based magnetic tunnel junctions with metastable bcc CoMnFe interlayer
- 作者: Deepak Kumar et al.
- 方向: MnGa MTJ
- 核心问题: 相比 CoMn，CoMnFe 插层能否在保持高 TMR 的同时提高 MnGa p-MTJ 的退火稳定性？
- 核心贡献: 证明 CoMnFe 是 MnGa/MgO 界面工程的有效插层，可在 300 C 退火后保持超过 100% TMR。
- 与我课题关系: 它是 2023 年 CoMn/Mg 插层工作的直接后续，特别适合你建立 MnGa MTJ 发展脉络和实验参数表。
- 关键指标: single_interface_tmr=~106% at 300 C annealing; double_interface_tmr=~110% at 300 C annealing; annealing_stability=超过 100% TMR 可稳定到 300 C；325 C 后下降; interlayer=Co65Mn19Fe16, tCoMnFe 约 1.2 nm 常用

### 024 通过插入铁磁层调控 MnGa/Ta 薄膜中的开关电流密度与自旋轨道力矩

- 原题: 2016-Sci. Rep.-MnGa-Ta
- 作者: Kangkang Meng et al.
- 方向: Current-Induced Switching
- 核心问题: 在 MnGa/Ta 体系中，插层的磁耦合和界面效应如何调控 SOT、有效场和开关电流密度？
- 核心贡献: 证明 SOT 开关电流不只由重金属决定，还可通过 MnGa/插层界面的耦合、Rashba 效应和 SHE 共同调节。
- 与我课题关系: 对 MnGa 电流诱导翻转很重要：它把材料插层、耦合方式、SOT 有效场和 Jc 串起来，适合用于设计低电流 MnGa 开关实验。
- 关键指标: jc_mnga_ta=8.5 x 10^7 A/cm2; jc_co2feal=5 x 10^7 A/cm2 with 0.8 nm Co2FeAl; jc_co=9 x 10^7 A/cm2 with 0.8 nm Co; anisotropy_fields=MnGa/Ta 1.5 T; Co2FeAl insertion 1.2 T; Co insertion 1.7 T; spin_hall_angle_ta=theta_SH about -0.11 (extracted)

### 025 具有垂直磁各向异性的 MnGa/Pt 薄膜中的电流诱导 SOT 磁化翻转

- 原题: 2016 Ranjbar Jpn. J. Appl. Phys. 55 120302-Current-induced spin–orbit torque magnetization switching in a MnGa-Pt film with a perpendicular magnetic anisotropy
- 作者: Reza Ranjbar et al.
- 方向: Current-Induced Switching
- 核心问题: 大体 PMA、低磁化强度的 MnGa 是否能像传统 HM/FM 体系一样实现 SOT 开关？
- 核心贡献: 首次级别地展示 MnGa/Pt 中可观测的 SOT 开关，为 Mn 基大 PMA 材料进入三端 MRAM 写入方案提供实验依据。
- 与我课题关系: 它是 MnGa SOT 开关路线的起点论文之一。适合作为“MnGa 可用于 SOT-MRAM 写入”的基础引用。
- 关键指标: ms=~150 kA/m; pma_field=mu0 Hk_eff ~2.5 T; pma_thickness_product=Ku_eff t ~0.47 mJ/m2; experimental_jc=~5.0 x 10^11 A/m2 in Pt at switching; stack=CoGa(15)/MnGa(2.5)/Pt(2.0) on MgO(001)

### 026 CoGa/MnGa/MgO 薄膜中的面内电流诱导磁化翻转

- 原题: 2017 Appl. Phys. Express 10 073004-Takikawa-In-plane current-induced magnetization switching in CoGa-MnGa-MgO films
- 作者: Masahiro Takikawa et al.
- 方向: Current-Induced Switching
- 核心问题: 如果去掉 Pt/Ta 重金属顶层，CoGa 缓冲层本身能否为 MnGa 提供足够 SOT，实现可用于 p-MTJ 结构的电流翻转？
- 核心贡献: 证明 CoGa/MnGa/MgO 这种更接近 MTJ 底电极的结构也能发生 SOT 开关，强调 CoGa 不只是缓冲层，也可能是自旋流来源。
- 与我课题关系: 非常贴近 MnGa MTJ 结构设计：CoGa 既是外延缓冲层，又可能参与 SOT 写入。对你理解膜堆中“功能层复用”很有价值。
- 关键指标: switching_current_density=~1 x 10^11 A/m2; experimental_jc_coga=~2 x 10^11 A/m2 at mu0Hy = 200 mT; pma_field=mu0 Hk_eff = 2.63 +/- 0.08 T; ms=350 +/- 50 kA/m; stack=MgO/MgO(10)/CoGa(15-25)/MnGa(2)/Mg/MgO/Ta

### 027 Cr 与 NiAl 缓冲层上 Ta/MnGa 的磁性与 SOT 磁化翻转

- 原题: 2019-AIP Advance-Ta-MnGa-NiAl or Cr
- 作者: Michihiko Yamanouchi et al.
- 方向: Current-Induced Switching
- 核心问题: 缓冲层导致的 PMA 质量差异如何影响超薄 MnGa 的 SOT 翻转行为？
- 核心贡献: 指出 NiAl 缓冲层优于 Cr 缓冲层，可抑制面内磁化分量并改善 Ta/MnGa 的 SOT 开关确定性。
- 与我课题关系: 对你做 MnGa/MnAl 外延或溅射很实用：缓冲层不仅影响 PMA，也直接影响电流翻转路径和器件一致性。
- 关键指标: mnga_thickness=1-3 nm; ni_al_sample_pma=1 nm MnGa 的有效各向异性场约 0.75 T; switching_current_density_ta=约 1.3 x 10^11 A/m2; comparison=Cr buffer: skewed loops / partial switching; NiAl buffer: square loops / clearer switching

## 下一阶段建议

- 优先整理 2023 和 2025 两篇高 TMR 插层论文的图表卡片，建立 MnGa MTJ 插层路线图。
- 把 SOT 相关论文按 Pt、CoGa、Ta、NiAl/Cr 缓冲层拆成对比表。
- 后续如果要服务微磁模拟，需要从 SOT 论文里补充 Ms、Ku、Hk、Jc、脉冲宽度和外场条件。
